import { parseArgs } from "node:util";
import type { TCanvasDoc, TElement, TGroup } from "@vibecanvas/shell/automerge/index";
import { openOfflineCanvasState } from "./offline-state";

const INSPECT_OUTPUT_MODES = ["summary", "focused", "full"] as const;

type TInspectOutputMode = (typeof INSPECT_OUTPUT_MODES)[number];

type TCanvasRow = {
  id: string;
  name: string;
  automerge_url: string;
  created_at: Date | string | number;
};

type TInspectJsonError = {
  ok: false;
  command: "canvas.inspect";
  code: string;
  message: string;
  canvasId?: string | null;
  canvasNameQuery?: string | null;
  targetId?: string;
  matches?: Array<{ id: string; name: string }>;
};

type TCanvasSummary = {
  id: string;
  name: string;
  automergeUrl: string;
  createdAt: string;
};

type TInspectSelector = {
  targetId: string;
  canvasId: string | null;
  canvasNameQuery: string | null;
};

type TInspectJsonSuccess = {
  ok: true;
  command: "canvas.inspect";
  mode: TInspectOutputMode;
  selector: TInspectSelector;
  canvas: TCanvasSummary;
  target: Record<string, unknown>;
};

function printInspectHelp(): void {
  console.log(`Usage: vibecanvas canvas inspect <id> [options]

Inspect one exact element or group id inside one selected canvas.

Required canvas selector (choose exactly one):
  --canvas <id>           Select one canvas by exact canvas row id
  --canvas-name <query>   Select one canvas by unique case-insensitive name substring

Options:
  --output <mode>         summary | focused | full (default: summary)
  --db <path>             Optional explicit SQLite file override for the opened db
  --json                  Emit machine-readable success/error payloads
  --help, -h              Show this help message

Output modes:
  summary   compact target metadata for quick lookup
  focused   summary fields plus child/detail fields for the inspected target
  full      the full persisted target record plus the inspect envelope

Notes:
  - <id> resolves by exact id inside the selected canvas only.
  - inspect is readonly and never mutates the document.
  - if --canvas-name matches 0 or more than 1 canvas, the command fails clearly.
  - when --db is omitted, inspect falls back to VIBECANVAS_DB, VIBECANVAS_CONFIG, then default dev/prod storage resolution.

Examples:
  vibecanvas canvas inspect rect-1 --canvas 3d3f... --output summary
  vibecanvas canvas inspect group-root --canvas-name design --output focused --json
`);
}

function exitWithInspectJsonError(error: TInspectJsonError): never {
  console.error(JSON.stringify(error));
  process.exit(1);
}

function exitWithInspectTextError(message: string): never {
  console.error(message);
  process.exit(1);
}

function exitInspectError(wantsJson: boolean, error: TInspectJsonError): never {
  if (wantsJson) exitWithInspectJsonError(error);
  exitWithInspectTextError(error.message);
}

function normalizeCanvas(row: TCanvasRow): TCanvasSummary {
  const createdAt = row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString();
  return { id: row.id, name: row.name, automergeUrl: row.automerge_url, createdAt };
}

function sortIds(values: readonly string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function buildGroupRelations(doc: TCanvasDoc, groupId: string): {
  directChildElementIds: string[];
  directChildGroupIds: string[];
  descendantElementCount: number;
  descendantGroupCount: number;
} {
  const directChildElementIds = sortIds(Object.values(doc.elements).filter((element) => element.parentGroupId === groupId).map((element) => element.id));
  const directChildGroupIds = sortIds(Object.values(doc.groups).filter((group) => group.parentGroupId === groupId).map((group) => group.id));
  const pending = [...directChildGroupIds];
  const visited = new Set<string>();
  let descendantElementCount = directChildElementIds.length;
  let descendantGroupCount = directChildGroupIds.length;

  while (pending.length > 0) {
    const currentGroupId = pending.shift();
    if (!currentGroupId || visited.has(currentGroupId)) continue;
    visited.add(currentGroupId);
    descendantElementCount += Object.values(doc.elements).filter((element) => element.parentGroupId === currentGroupId).length;
    for (const nestedGroupId of Object.values(doc.groups).filter((group) => group.parentGroupId === currentGroupId).map((group) => group.id)) {
      if (visited.has(nestedGroupId)) continue;
      descendantGroupCount += 1;
      pending.push(nestedGroupId);
    }
  }

  return {
    directChildElementIds,
    directChildGroupIds,
    descendantElementCount,
    descendantGroupCount,
  };
}

function buildElementPayload(element: TElement, mode: TInspectOutputMode): Record<string, unknown> {
  const summary = {
    kind: "element",
    id: element.id,
    type: element.data.type,
    parentGroupId: element.parentGroupId,
    zIndex: element.zIndex,
    locked: element.locked,
    position: { x: element.x, y: element.y },
    createdAt: element.createdAt,
    updatedAt: element.updatedAt,
  };

  if (mode === "summary") return summary;
  if (mode === "focused") return { ...summary, bindingCount: element.bindings.length, data: structuredClone(element.data), style: structuredClone(element.style) };
  return { kind: "element", id: element.id, record: structuredClone(element) };
}

function buildGroupPayload(group: TGroup, doc: TCanvasDoc, mode: TInspectOutputMode): Record<string, unknown> {
  const relations = buildGroupRelations(doc, group.id);
  const summary = {
    kind: "group",
    id: group.id,
    parentGroupId: group.parentGroupId,
    zIndex: group.zIndex,
    locked: group.locked,
    createdAt: group.createdAt,
    directChildElementIds: relations.directChildElementIds,
    directChildGroupIds: relations.directChildGroupIds,
    directChildElementCount: relations.directChildElementIds.length,
    directChildGroupCount: relations.directChildGroupIds.length,
  };

  if (mode === "summary") return summary;
  if (mode === "focused") return { ...summary, ...relations };
  return { kind: "group", id: group.id, record: structuredClone(group), ...relations };
}

function renderTextResult(result: TInspectJsonSuccess): string {
  if (result.mode === "full") return JSON.stringify(result, null, 2);

  if (result.target.kind === "element") {
    const target = result.target as {
      id: string;
      type: string;
      parentGroupId: string | null;
      zIndex: string;
      locked: boolean;
      position: { x: number; y: number };
      bindingCount?: number;
    };

    if (result.mode === "summary") {
      return `element ${target.id} [${target.type}] canvas=${result.canvas.id} name=${JSON.stringify(result.canvas.name)} parent=${target.parentGroupId ?? "null"} pos=(${target.position.x}, ${target.position.y}) z=${target.zIndex} locked=${String(target.locked)}`;
    }

    return [
      `Canvas: ${result.canvas.name} (${result.canvas.id})`,
      `Target: element ${target.id} [${target.type}]`,
      `Parent group: ${target.parentGroupId ?? "null"}`,
      `Position: ${target.position.x}, ${target.position.y}`,
      `Z index: ${target.zIndex}`,
      `Locked: ${String(target.locked)}`,
      `Bindings: ${String(target.bindingCount ?? 0)}`,
    ].join("\n");
  }

  const target = result.target as {
    id: string;
    parentGroupId: string | null;
    zIndex: string;
    locked: boolean;
    directChildElementIds?: string[];
    directChildGroupIds?: string[];
    directChildElementCount: number;
    directChildGroupCount: number;
    descendantElementCount?: number;
    descendantGroupCount?: number;
  };

  if (result.mode === "summary") {
    const childElements = `[${(target.directChildElementIds ?? []).join(", ")}]`;
    const childGroups = `[${(target.directChildGroupIds ?? []).join(", ")}]`;
    return `group ${target.id} canvas=${result.canvas.id} name=${JSON.stringify(result.canvas.name)} parent=${target.parentGroupId ?? "null"} direct-elements=${target.directChildElementCount} ${childElements} direct-groups=${target.directChildGroupCount} ${childGroups} z=${target.zIndex} locked=${String(target.locked)}`;
  }

  return [
    `Canvas: ${result.canvas.name} (${result.canvas.id})`,
    `Target: group ${target.id}`,
    `Parent group: ${target.parentGroupId ?? "null"}`,
    `Direct child elements: ${target.directChildElementCount}`,
    `Direct child groups: ${target.directChildGroupCount}`,
    `Descendant elements: ${String(target.descendantElementCount ?? 0)}`,
    `Descendant groups: ${String(target.descendantGroupCount ?? 0)}`,
    `Z index: ${target.zIndex}`,
    `Locked: ${String(target.locked)}`,
  ].join("\n");
}

function resolveCanvasSelection(rows: TCanvasRow[], selector: { canvasId: string | null; canvasNameQuery: string | null }, wantsJson: boolean): TCanvasRow {
  if (selector.canvasId && selector.canvasNameQuery) {
    exitInspectError(wantsJson, {
      ok: false,
      command: "canvas.inspect",
      code: "CANVAS_SELECTOR_CONFLICT",
      message: "Pass exactly one canvas selector: use either --canvas <id> or --canvas-name <query>.",
      canvasId: selector.canvasId,
      canvasNameQuery: selector.canvasNameQuery,
    });
  }

  if (!selector.canvasId && !selector.canvasNameQuery) {
    exitInspectError(wantsJson, {
      ok: false,
      command: "canvas.inspect",
      code: "CANVAS_SELECTOR_REQUIRED",
      message: "Inspect requires one canvas selector. Pass --canvas <id> or --canvas-name <query>.",
      canvasId: null,
      canvasNameQuery: null,
    });
  }

  if (selector.canvasId) {
    const exact = rows.find((row) => row.id === selector.canvasId);
    if (exact) return exact;
    exitInspectError(wantsJson, {
      ok: false,
      command: "canvas.inspect",
      code: "CANVAS_SELECTOR_NOT_FOUND",
      message: `Canvas '${selector.canvasId}' was not found.`,
      canvasId: selector.canvasId,
      canvasNameQuery: null,
    });
  }

  const query = selector.canvasNameQuery?.trim() ?? "";
  if (!query) {
    exitInspectError(wantsJson, {
      ok: false,
      command: "canvas.inspect",
      code: "CANVAS_SELECTOR_REQUIRED",
      message: "Inspect requires one canvas selector. Pass --canvas <id> or --canvas-name <query>.",
      canvasId: null,
      canvasNameQuery: selector.canvasNameQuery,
    });
  }

  const loweredQuery = query.toLocaleLowerCase();
  const matches = rows.filter((row) => row.name.toLocaleLowerCase().includes(loweredQuery));
  if (matches.length === 1) return matches[0]!;

  if (matches.length === 0) {
    exitInspectError(wantsJson, {
      ok: false,
      command: "canvas.inspect",
      code: "CANVAS_SELECTOR_NOT_FOUND",
      message: `Canvas name query '${query}' did not match any canvas.`,
      canvasId: null,
      canvasNameQuery: query,
    });
  }

  exitInspectError(wantsJson, {
    ok: false,
    command: "canvas.inspect",
    code: "CANVAS_SELECTOR_AMBIGUOUS",
    message: `Canvas name query '${query}' matched ${matches.length} canvases. Pass --canvas <id> instead.`,
    canvasId: null,
    canvasNameQuery: query,
    matches: sortIds(matches.map((row) => row.name)).map((name) => {
      const row = matches.find((candidate) => candidate.name === name)!;
      return { id: row.id, name: row.name };
    }),
  });
}

function resolveOutputMode(output: string | boolean | undefined, wantsJson: boolean): TInspectOutputMode {
  const mode = typeof output === "string" ? output : "summary";
  if (INSPECT_OUTPUT_MODES.includes(mode as TInspectOutputMode)) return mode as TInspectOutputMode;
  exitInspectError(wantsJson, {
    ok: false,
    command: "canvas.inspect",
    code: "CANVAS_OUTPUT_INVALID",
    message: `Invalid --output '${mode}'. Expected one of: ${INSPECT_OUTPUT_MODES.join(", ")}.`,
  });
}

async function loadCanvasDoc(row: TCanvasRow): Promise<TCanvasDoc> {
  const { repo } = await openOfflineCanvasState();
  const handle = await repo.find<TCanvasDoc>(row.automerge_url as never);
  await handle.whenReady();
  const doc = handle.doc();
  if (!doc) throw new Error(`Canvas doc '${row.automerge_url}' is unavailable.`);
  return structuredClone(doc);
}

async function runSilently<TResult>(callback: () => Promise<TResult>): Promise<TResult> {
  const originalConsoleLog = console.log;
  console.log = () => undefined;
  try {
    return await callback();
  } finally {
    console.log = originalConsoleLog;
  }
}

export async function runCanvasInspect(argv: readonly string[]): Promise<never> {
  const { values, positionals } = parseArgs({
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
    },
  });

  const wantsJson = Boolean(values.json);
  const targetId = positionals[4];

  if (values.help) {
    printInspectHelp();
    process.exit(0);
  }

  if (!targetId) {
    exitInspectError(wantsJson, {
      ok: false,
      command: "canvas.inspect",
      code: "CANVAS_INSPECT_TARGET_REQUIRED",
      message: "Inspect requires one exact target id. Usage: vibecanvas canvas inspect <id> --canvas <canvas-id>.",
    });
  }

  const outputMode = resolveOutputMode(values.output, wantsJson);

  try {
    const { db } = await runSilently(() => openOfflineCanvasState());
    const rows = db.query.canvas.findMany().sync() as TCanvasRow[];
    const selectedCanvas = resolveCanvasSelection(rows, {
      canvasId: typeof values.canvas === "string" ? values.canvas : null,
      canvasNameQuery: typeof values["canvas-name"] === "string" ? values["canvas-name"] : null,
    }, wantsJson);
    const doc = await runSilently(() => loadCanvasDoc(selectedCanvas));
    const element = doc.elements[targetId];
    const group = doc.groups[targetId];

    if (element && group) {
      exitInspectError(wantsJson, {
        ok: false,
        command: "canvas.inspect",
        code: "CANVAS_INSPECT_TARGET_AMBIGUOUS",
        message: `Target '${targetId}' exists as both an element and a group in canvas '${selectedCanvas.name}'.`,
        canvasId: selectedCanvas.id,
        targetId,
      });
    }

    if (!element && !group) {
      exitInspectError(wantsJson, {
        ok: false,
        command: "canvas.inspect",
        code: "CANVAS_INSPECT_TARGET_NOT_FOUND",
        message: `Target '${targetId}' was not found in canvas '${selectedCanvas.name}'.`,
        canvasId: selectedCanvas.id,
        targetId,
      });
    }

    const result: TInspectJsonSuccess = {
      ok: true,
      command: "canvas.inspect",
      mode: outputMode,
      selector: {
        targetId,
        canvasId: typeof values.canvas === "string" ? values.canvas : null,
        canvasNameQuery: typeof values["canvas-name"] === "string" ? values["canvas-name"] : null,
      },
      canvas: normalizeCanvas(selectedCanvas),
      target: element ? buildElementPayload(element, outputMode) : buildGroupPayload(group!, doc, outputMode),
    };

    if (wantsJson) {
      console.log(JSON.stringify(result));
      process.exit(0);
    }

    console.log(renderTextResult(result));
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    exitInspectError(wantsJson, {
      ok: false,
      command: "canvas.inspect",
      code: "CANVAS_BOOTSTRAP_FAILED",
      message,
      targetId,
      canvasId: typeof values.canvas === "string" ? values.canvas : null,
      canvasNameQuery: typeof values["canvas-name"] === "string" ? values["canvas-name"] : null,
    });
  }
}
