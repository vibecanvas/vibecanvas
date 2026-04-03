import { parseArgs } from "node:util";
import { openOfflineCanvasState } from "./offline-state";
import { createSceneTargets, matchesSceneSelector, resolveSelectorEnvelope, type TSceneSelectorEnvelope, validateGroupSelector } from "./scene-query-shared";
import { buildMatchMetadata, buildTargetPayload, loadCanvasDoc, normalizeCanvas, resolveCanvasSelection, resolveOutputMode, runSilently, type TCanvasRow, type TSceneBounds, type TSceneMatchMetadata, type TSceneOutputMode, type TSceneTarget } from "./scene-shared";

type TQueryJsonError = {
  ok: false;
  command: "canvas.query";
  code: string;
  message: string;
  canvasId?: string | null;
  canvasNameQuery?: string | null;
};

type TQueryJsonMatch = {
  metadata: TSceneMatchMetadata;
  payload: Record<string, unknown>;
};

type TQueryJsonSuccess = {
  ok: true;
  command: "canvas.query";
  mode: TSceneOutputMode;
  selector: TSceneSelectorEnvelope;
  canvas: ReturnType<typeof normalizeCanvas>;
  count: number;
  matches: TQueryJsonMatch[];
};

type TQueryOutputOptions = {
  omitData: boolean;
  omitStyle: boolean;
};

function printQueryHelp(): void {
  console.log(`Usage: vibecanvas canvas query [options]

Query elements and groups inside one selected canvas using structured selectors only.

Required canvas selector (choose exactly one):
  --canvas <id>             Select one canvas by exact canvas row id
  --canvas-name <query>     Select one canvas by unique case-insensitive name substring

Selector inputs (choose at most one style):
  Structured flags:
    --id <id>               Match exact element/group ids (repeatable)
    --kind <kind>           element | group (repeatable)
    --type <type>           Match persisted element types only (repeatable)
    --style <key=value>     Match exact persisted element style values (repeatable)
    --group <group-id>      Match direct children of one parent group
    --subtree <group-id>    Match the root group plus all nested descendants
    --bounds <x,y,w,h>      Match computed persisted bounds
    --bounds-mode <mode>    intersects | contains (default: intersects)

  --where <querystring>     Same selector fields encoded as query params
                             Example: "type=rect&style.backgroundColor=%23ff0000&subtree=group-root&bounds=0,0,500,400"

  --query <json>            JSON object with { ids, kinds, types, style, group, subtree, bounds, boundsMode }

Options:
  --output <mode>           summary | focused | full (default: summary)
  --omitdata                Exclude data subfields from query results
  --omitstyle               Exclude style subfields from query results
  --db <path>               Optional explicit SQLite file override for the opened db
  --json                    Emit machine-readable success/error payloads
  --help, -h                Show this help message

Output modes:
  summary   compact per-match metadata and summary payloads
  focused   summary fields plus child/detail fields for each match
  full      the full persisted target record plus the query envelope

Notes:
  - query is strictly readonly and never mutates the document.
  - query never performs natural-language parsing.
  - pass at most one selector input style: structured flags, --where, or --query.
  - --group matches direct children only.
  - --subtree includes the root group and all nested descendants.
  - group bounds are derived from descendant elements; empty groups do not match bounds filters.
  - when --db is omitted, query falls back to VIBECANVAS_DB, VIBECANVAS_CONFIG, then default dev/prod storage resolution.

Examples:
  vibecanvas canvas query --canvas 3d3f... --type rect --output summary
  vibecanvas canvas query --canvas-name design --where "subtree=group-root&type=text" --json
  vibecanvas canvas query --canvas 3d3f... --style backgroundColor=#ff0000 --json
  vibecanvas canvas query --canvas 3d3f... --query '{"bounds":{"x":0,"y":0,"w":800,"h":600}}' --json
`);
}

function exitWithQueryJsonError(error: TQueryJsonError): never {
  console.error(JSON.stringify(error));
  process.exit(1);
}

function exitWithQueryTextError(message: string): never {
  console.error(message);
  process.exit(1);
}

function exitQueryError(wantsJson: boolean, error: TQueryJsonError): never {
  if (wantsJson) exitWithQueryJsonError(error);
  exitWithQueryTextError(error.message);
}

function buildQueryPayload(target: TSceneTarget, doc: Awaited<ReturnType<typeof loadCanvasDoc>>, mode: TSceneOutputMode, options: TQueryOutputOptions): Record<string, unknown> {
  const payload = buildTargetPayload(target, doc, mode);
  if (target.kind === "element") {
    return {
      ...payload,
      ...(options.omitData ? {} : { data: structuredClone(target.element.data) }),
      ...(options.omitStyle ? {} : { style: structuredClone(target.element.style) }),
    };
  }

  return {
    ...payload,
    ...(options.omitData ? {} : { data: null }),
    ...(options.omitStyle ? {} : { style: null }),
  };
}

function formatBounds(bounds: TSceneBounds | null): string {
  if (!bounds) return "null";
  return `(${bounds.x}, ${bounds.y}, ${bounds.w}, ${bounds.h})`;
}

function renderTextResult(result: TQueryJsonSuccess): string {
  if (result.mode !== "summary") return JSON.stringify(result, null, 2);
  const label = result.count === 1 ? "target" : "targets";
  const lines = [`Query matched ${result.count} ${label} in canvas=${result.canvas.id} name=${JSON.stringify(result.canvas.name)} mode=${result.mode}`];
  for (const match of result.matches) {
    const suffixParts = [
      Object.prototype.hasOwnProperty.call(match.payload, "data") ? `data=${JSON.stringify((match.payload as { data?: unknown }).data ?? null)}` : null,
      Object.prototype.hasOwnProperty.call(match.payload, "style") ? `style=${JSON.stringify((match.payload as { style?: unknown }).style ?? null)}` : null,
    ].filter((value): value is string => Boolean(value));
    const suffix = suffixParts.length > 0 ? ` ${suffixParts.join(" ")}` : "";
    if (match.metadata.kind === "element") {
      lines.push(`- element ${match.metadata.id} [${match.metadata.type}] parent=${match.metadata.parentGroupId ?? "null"} bounds=${formatBounds(match.metadata.bounds)} z=${match.metadata.zIndex} locked=${String(match.metadata.locked)}${suffix}`);
      continue;
    }

    lines.push(`- group ${match.metadata.id} parent=${match.metadata.parentGroupId ?? "null"} bounds=${formatBounds(match.metadata.bounds)} z=${match.metadata.zIndex} locked=${String(match.metadata.locked)}${suffix}`);
  }
  return `${lines.join("\n")}\n`;
}

export async function runCanvasQuery(argv: readonly string[]): Promise<never> {
  const { values } = parseArgs({
    args: argv,
    strict: false,
    allowPositionals: true,
    options: {
      help: { type: "boolean", short: "h", default: false },
      json: { type: "boolean", default: false },
      db: { type: "string" },
      canvas: { type: "string" },
      "canvas-name": { type: "string" },
      output: { type: "string" },
      omitdata: { type: "boolean", default: false },
      omitstyle: { type: "boolean", default: false },
      id: { type: "string", multiple: true },
      kind: { type: "string", multiple: true },
      type: { type: "string", multiple: true },
      style: { type: "string", multiple: true },
      group: { type: "string" },
      subtree: { type: "string" },
      bounds: { type: "string" },
      "bounds-mode": { type: "string" },
      where: { type: "string" },
      query: { type: "string" },
    },
  });

  const wantsJson = Boolean(values.json);
  const canvasId = typeof values.canvas === "string" ? values.canvas : null;
  const canvasNameQuery = typeof values["canvas-name"] === "string" ? values["canvas-name"] : null;
  const outputOptions: TQueryOutputOptions = {
    omitData: Boolean(values.omitdata),
    omitStyle: Boolean(values.omitstyle),
  };

  if (values.help) {
    printQueryHelp();
    process.exit(0);
  }

  const outputMode = resolveOutputMode({
    output: values.output,
    command: "canvas.query",
    fail: (error) => exitQueryError(wantsJson, error),
  });

  const selector = resolveSelectorEnvelope({
    values,
    canvasId,
    canvasNameQuery,
    command: "canvas.query",
    fail: (error) => exitQueryError(wantsJson, error as TQueryJsonError),
  });

  try {
    const { db } = await runSilently(() => openOfflineCanvasState());
    const rows = db.query.canvas.findMany().sync() as TCanvasRow[];
    const selectedCanvas = resolveCanvasSelection({
      rows,
      selector: { canvasId, canvasNameQuery },
      wantsJson,
      command: "canvas.query",
      actionLabel: "Query",
      fail: (error) => exitQueryError(wantsJson, error),
    });
    const doc = await runSilently(() => loadCanvasDoc(selectedCanvas));
    validateGroupSelector({ doc, selector: selector.filters, command: "canvas.query", canvasId: selectedCanvas.id, canvasNameQuery, fail: (error) => exitQueryError(wantsJson, error as TQueryJsonError) });
    const matches = createSceneTargets(doc)
      .filter((target) => matchesSceneSelector(target, doc, selector.filters))
      .map((target) => ({ metadata: buildMatchMetadata(target, doc), payload: buildQueryPayload(target, doc, outputMode, outputOptions) } satisfies TQueryJsonMatch));

    const result: TQueryJsonSuccess = {
      ok: true,
      command: "canvas.query",
      mode: outputMode,
      selector,
      canvas: normalizeCanvas(selectedCanvas),
      count: matches.length,
      matches,
    };

    if (wantsJson) {
      console.log(JSON.stringify(result));
      process.exit(0);
    }

    process.stdout.write(renderTextResult(result));
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    exitQueryError(wantsJson, {
      ok: false,
      command: "canvas.query",
      code: "CANVAS_BOOTSTRAP_FAILED",
      message,
      canvasId,
      canvasNameQuery,
    });
  }
}
