import Handlebars from "handlebars";

// fall back to external if internal is not set
export function tInternal(err: TErrorEntry): string {
    if (!err.internalMessage) return `${err.code}: ${err.statusCode}. External message: ${tExternal(err, "en")}`;
    return Handlebars.compile(err.internalMessage)(err.handlebarsParams);
}

export function tExternal(err: TErrorEntry, lang: TLang = 'en'): string {
    if (!err.externalMessage) return `Unknown error`
    const template = err.externalMessage[lang] ?? err.externalMessage.en
    return Handlebars.compile(template)(err.handlebarsParams);
}

/**
 * Executes rollback functions in reverse order
 * Handles nested rollbacks returned in TErrTriple format
 */
export async function executeRollbacks(rollbacks: TExternalRollback[]): Promise<void> {
    const reversed = [...rollbacks].reverse();

    for (const rollback of reversed) {
      try {
        const [, , nestedRollbacks] = await rollback();
        if (nestedRollbacks && nestedRollbacks.length > 0) {
          await executeRollbacks(nestedRollbacks);
        }
      } catch (err) {
        console.error("Rollback failed", err);
      }
    }
}
