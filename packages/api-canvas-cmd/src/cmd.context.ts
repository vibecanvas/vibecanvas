import type { TCanvasDoc } from '@vibecanvas/shell/automerge/index';
import type { TCanvasCmdContext } from '@vibecanvas/canvas-cmds';
import type { TCanvasCmdApiContext } from './types';

async function waitForCanvasHandleDoc(args: {
  automergeUrl: string;
  predicate: (doc: TCanvasDoc) => boolean;
  doc: () => TCanvasDoc | undefined;
  timeoutMs?: number;
}): Promise<TCanvasDoc> {
  const startedAt = Date.now();
  let lastError: unknown = null;

  while (Date.now() - startedAt < (args.timeoutMs ?? 2000)) {
    try {
      const doc = args.doc();
      if (!doc) throw new Error(`Canvas doc '${args.automergeUrl}' is unavailable.`);
      if (args.predicate(doc)) return structuredClone(doc);
    } catch (error) {
      lastError = error;
    }

    await Bun.sleep(25);
  }

  throw new Error(`Timed out waiting for canvas doc '${args.automergeUrl}': ${String(lastError)}`);
}

function createCanvasCmdContext(context: TCanvasCmdApiContext): TCanvasCmdContext {
  return {
    async listCanvasRows() {
      return context.db.listCanvas();
    },
    async loadCanvasHandle(row) {
      const handle = await context.automerge.repo.find<TCanvasDoc>(row.automerge_url as never);
      await handle.whenReady();
      return {
        handle,
        source: 'live',
      };
    },
    async waitForMutation(args) {
      return waitForCanvasHandleDoc({
        automergeUrl: args.automergeUrl,
        predicate: args.predicate,
        doc: () => args.handle.doc() ?? undefined,
        timeoutMs: args.source === 'live' ? 4000 : 2000,
      });
    },
  };
}

export { createCanvasCmdContext };
