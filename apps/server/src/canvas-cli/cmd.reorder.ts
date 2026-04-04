import { parseArgs } from "node:util";
import type { TCanvasDoc, TElement, TGroup } from "@vibecanvas/shell/automerge/index";
import { openOfflineCanvasState } from "./offline-state";
import { loadCanvasHandle, normalizeCanvas, resolveCanvasSelection, runSilently, sortIds, waitForLiveCanvasDoc, waitForPersistedCanvasDoc, type TCanvasRow, type TCanvasSelectionError, type TCanvasSummary } from "./scene-shared";

const REORDER_ACTIONS = ["front", "back", "forward", "backward"] as const;

type TReorderAction = (typeof REORDER_ACTIONS)[number];
type TReorderTarget = { kind: "element"; element: TElement } | { kind: "group"; group: TGroup };
type TOrderEntry = { id: string; zIndex: string; kind: "element" | "group" };

type TReorderJsonError = TCanvasSelectionError & {
  command: "canvas.reorder";
};

type TReorderJsonSuccess = {
  ok: true;
  command: "canvas.reorder";
  action: TReorderAction;
  canvas: TCanvasSummary;
  matchedCount: number;
  matchedIds: string[];
  parentGroupId: string | null;
  beforeOrder: TOrderEntry[];
  afterOrder: TOrderEntry[];
  changedIds: string[];
};

function printReorderHelp(): void {
  console.log(`Usage: vibecanvas canvas reorder [options]

Reorder explicit element/group ids inside one selected canvas.

Required canvas selector (choose exactly one):
  --canvas <id>             Select one canvas by exact canvas row id
  --canvas-name <query>     Select one canvas by unique case-insensitive name substring

Required target selector:
  --id <id>                 Exact element/group id to reorder (repeatable)

Required action:
  --action <name>           One of: front, back, forward, backward

Options:
  --db <path>               Optional explicit SQLite file override for the opened db
  --json                    Emit machine-readable success/error payloads
  --help, -h                Show this help message

Output:
  Text mode prints the requested action and before/after sibling order.
  JSON mode prints { ok, command, action, canvas, matchedCount, matchedIds, parentGroupId, beforeOrder, afterOrder, changedIds }.

Notes:
  - all reordered ids must share the same direct parentGroupId.
  - reorder updates sibling zIndex ordering only.
  - no-op reorder requests fail clearly instead of silently succeeding.
`);
}

function exitWithReorderJsonError(error: TReorderJsonError): never {
  console.error(JSON.stringify(error));
  process.exit(1);
}

function exitWithReorderTextError(message: string): never {
  console.error(message);
  process.exit(1);
}

function exitReorderError(wantsJson: boolean, error: TReorderJsonError): never {
  if (wantsJson) exitWithReorderJsonError(error);
  exitWithReorderTextError(error.message);
}

function createOrderedZIndex(index: number): string {
  return `z${String(index).padStart(8, "0")}`;
}

function parseReorderIds(args: { raw: unknown; wantsJson: boolean; canvasId: string | null; canvasNameQuery: string | null }): string[] {
  const values = Array.isArray(args.raw) ? args.raw : args.raw === undefined ? [] : [args.raw];
  const ids = sortIds([...new Set(values.flatMap((value) => typeof value === "string" ? value.split(",") : []).map((value) => value.trim()).filter(Boolean))]);
  if (ids.length > 0) return ids;

  exitReorderError(args.wantsJson, {
    ok: false,
    command: "canvas.reorder",
    code: "CANVAS_REORDER_ID_REQUIRED",
    message: "Reorder requires at least one --id <id> target.",
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
  });
}

function parseReorderAction(args: { raw: unknown; wantsJson: boolean; canvasId: string | null; canvasNameQuery: string | null }): TReorderAction {
  const action = typeof args.raw === "string" ? args.raw.trim() : "";
  if (REORDER_ACTIONS.includes(action as TReorderAction)) return action as TReorderAction;

  exitReorderError(args.wantsJson, {
    ok: false,
    command: "canvas.reorder",
    code: "CANVAS_REORDER_ACTION_INVALID",
    message: `Invalid --action '${String(args.raw)}'. Expected one of: ${REORDER_ACTIONS.join(", ")}.`,
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
  });
}

function resolveTargetsByIds(args: { doc: TCanvasDoc; ids: string[]; wantsJson: boolean; canvasId: string; canvasNameQuery: string | null }): TReorderTarget[] {
  const targets = args.ids.map((id) => args.doc.groups[id] ? { kind: "group", group: args.doc.groups[id]! } as TReorderTarget : args.doc.elements[id] ? { kind: "element", element: args.doc.elements[id]! } as TReorderTarget : null);
  const missingIds = args.ids.filter((_, index) => targets[index] === null);
  if (missingIds.length === 0) return targets.filter((target): target is TReorderTarget => target !== null);

  exitReorderError(args.wantsJson, {
    ok: false,
    command: "canvas.reorder",
    code: "CANVAS_REORDER_TARGET_NOT_FOUND",
    message: `Target ids were not found in canvas '${args.doc.name}': ${sortIds(missingIds).join(", ")}.`,
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
  });
}

function getParentGroupId(target: TReorderTarget): string | null {
  return target.kind === "element" ? target.element.parentGroupId ?? null : target.group.parentGroupId ?? null;
}

function ensureSameParentGroupId(args: { targets: readonly TReorderTarget[]; wantsJson: boolean; canvasId: string; canvasNameQuery: string | null }): string | null {
  const parentGroupIds = [...new Set(args.targets.map((target) => getParentGroupId(target)))];
  if (parentGroupIds.length === 1) return parentGroupIds[0] ?? null;

  exitReorderError(args.wantsJson, {
    ok: false,
    command: "canvas.reorder",
    code: "CANVAS_REORDER_PARENT_MISMATCH",
    message: "All reordered ids must share the same direct parentGroupId.",
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
  });
}

function getSiblingOrder(doc: TCanvasDoc, parentGroupId: string | null): TOrderEntry[] {
  const entries: TOrderEntry[] = [
    ...Object.values(doc.groups)
      .filter((group) => (group.parentGroupId ?? null) === parentGroupId)
      .map((group) => ({ id: group.id, zIndex: group.zIndex, kind: "group" as const })),
    ...Object.values(doc.elements)
      .filter((element) => (element.parentGroupId ?? null) === parentGroupId)
      .map((element) => ({ id: element.id, zIndex: element.zIndex, kind: "element" as const })),
  ];

  return entries.sort((left, right) => {
    const zCompare = left.zIndex.localeCompare(right.zIndex);
    if (zCompare !== 0) return zCompare;
    if (left.kind !== right.kind) return left.kind.localeCompare(right.kind);
    return left.id.localeCompare(right.id);
  });
}

function applyReorderAction(order: readonly TOrderEntry[], selectedIds: readonly string[], action: TReorderAction): TOrderEntry[] {
  const selected = new Set(selectedIds);
  const units = order.map((entry) => ({ entries: [entry], selected: selected.has(entry.id) }));

  if (action === "front") return [...units.filter((unit) => !unit.selected), ...units.filter((unit) => unit.selected)].flatMap((unit) => unit.entries);
  if (action === "back") return [...units.filter((unit) => unit.selected), ...units.filter((unit) => !unit.selected)].flatMap((unit) => unit.entries);

  const next = [...units];
  if (action === "forward") {
    for (let index = next.length - 2; index >= 0; index -= 1) {
      if (!next[index].selected && next[index + 1].selected) {
        [next[index], next[index + 1]] = [next[index + 1], next[index]];
      }
    }
    return next.flatMap((unit) => unit.entries);
  }

  for (let index = 1; index < next.length; index += 1) {
    if (next[index].selected && !next[index - 1].selected) {
      [next[index], next[index - 1]] = [next[index - 1], next[index]];
    }
  }
  return next.flatMap((unit) => unit.entries);
}

function renderReorderTextResult(result: TReorderJsonSuccess): string {
  return `Reordered ${result.matchedCount} targets in canvas=${result.canvas.id} name=${JSON.stringify(result.canvas.name)} action=${result.action} parentGroupId=${result.parentGroupId ?? "null"} beforeOrder=${JSON.stringify(result.beforeOrder)} afterOrder=${JSON.stringify(result.afterOrder)}\n`;
}

export async function runCanvasReorder(argv: readonly string[]): Promise<never> {
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
      id: { type: "string", multiple: true },
      action: { type: "string" },
    },
  });

  const wantsJson = Boolean(values.json);
  const canvasId = typeof values.canvas === "string" ? values.canvas : null;
  const canvasNameQuery = typeof values["canvas-name"] === "string" ? values["canvas-name"] : null;

  if (values.help) {
    printReorderHelp();
    process.exit(0);
  }

  const ids = parseReorderIds({ raw: values.id, wantsJson, canvasId, canvasNameQuery });
  const action = parseReorderAction({ raw: values.action, wantsJson, canvasId, canvasNameQuery });

  try {
    const { db, dbPath } = await runSilently(() => openOfflineCanvasState());
    const rows = db.query.canvas.findMany().sync() as TCanvasRow[];
    const selectedCanvas = resolveCanvasSelection({
      rows,
      selector: { canvasId, canvasNameQuery },
      wantsJson,
      command: "canvas.reorder",
      actionLabel: "Reorder",
      fail: (error) => exitReorderError(wantsJson, error as TReorderJsonError),
    });
    const resolvedHandle = await runSilently(() => loadCanvasHandle(selectedCanvas));
    const currentDoc = resolvedHandle.handle.doc();
    if (!currentDoc) throw new Error(`Canvas doc '${selectedCanvas.automerge_url}' is unavailable.`);
    const doc = structuredClone(currentDoc);
    const matchedTargets = resolveTargetsByIds({ doc, ids, wantsJson, canvasId: selectedCanvas.id, canvasNameQuery });
    const parentGroupId = ensureSameParentGroupId({ targets: matchedTargets, wantsJson, canvasId: selectedCanvas.id, canvasNameQuery });
    const beforeOrder = getSiblingOrder(doc, parentGroupId);
    const afterOrderUnindexed = applyReorderAction(beforeOrder, ids, action);

    if (beforeOrder.map((entry) => entry.id).join("|") === afterOrderUnindexed.map((entry) => entry.id).join("|")) {
      exitReorderError(wantsJson, {
        ok: false,
        command: "canvas.reorder",
        code: "CANVAS_REORDER_NO_OP",
        message: "Reorder would not change sibling order for the requested action.",
        canvasId: selectedCanvas.id,
        canvasNameQuery,
      });
    }

    const afterOrder = afterOrderUnindexed.map((entry, index) => ({ ...entry, zIndex: createOrderedZIndex(index) }));
    const changedIds = sortIds(afterOrder.filter((entry, index) => beforeOrder[index]?.id !== entry.id || beforeOrder[index]?.zIndex !== entry.zIndex).map((entry) => entry.id));
    const handle = resolvedHandle.handle;

    handle.change((nextDoc) => {
      for (const entry of afterOrder) {
        if (entry.kind === "group") {
          const group = nextDoc.groups[entry.id];
          if (group) group.zIndex = entry.zIndex;
          continue;
        }

        const element = nextDoc.elements[entry.id];
        if (element) element.zIndex = entry.zIndex;
      }
    });

    const predicate = (persistedDoc: TCanvasDoc) => {
      const persistedOrder = getSiblingOrder(persistedDoc, parentGroupId);
      return persistedOrder.length === afterOrder.length && persistedOrder.every((entry, index) => entry.id === afterOrder[index]?.id && entry.zIndex === afterOrder[index]?.zIndex && entry.kind === afterOrder[index]?.kind);
    };

    if (resolvedHandle.source === "live") {
      await waitForLiveCanvasDoc({ automergeUrl: selectedCanvas.automerge_url, predicate });
    } else {
      await waitForPersistedCanvasDoc({ databasePath: dbPath, automergeUrl: selectedCanvas.automerge_url, predicate });
    }

    const result: TReorderJsonSuccess = {
      ok: true,
      command: "canvas.reorder",
      action,
      canvas: normalizeCanvas(selectedCanvas),
      matchedCount: ids.length,
      matchedIds: ids,
      parentGroupId,
      beforeOrder,
      afterOrder,
      changedIds,
    };

    if (wantsJson) {
      console.log(JSON.stringify(result));
      process.exit(0);
    }

    process.stdout.write(renderReorderTextResult(result));
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    exitReorderError(wantsJson, {
      ok: false,
      command: "canvas.reorder",
      code: "CANVAS_BOOTSTRAP_FAILED",
      message,
      canvasId,
      canvasNameQuery,
    });
  }
}
