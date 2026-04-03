import { parseArgs } from "node:util";
import type { TCanvasDoc } from "@vibecanvas/shell/automerge/index";
import { openOfflineCanvasState } from "./offline-state";
import { getTargetBounds, loadCanvasDoc, loadCanvasHandle, normalizeCanvas, resolveCanvasSelection, runSilently, sortIds, waitForLiveCanvasDoc, waitForPersistedCanvasDoc, type TCanvasRow, type TCanvasSelectionError, type TCanvasSummary, type TSceneTarget } from "./scene-shared";

type TMoveMode = "relative" | "absolute";

type TMoveJsonError = TCanvasSelectionError & {
  command: "canvas.move";
};

type TMoveJsonSuccess = {
  ok: true;
  command: "canvas.move";
  mode: TMoveMode;
  input: {
    x: number;
    y: number;
  };
  delta: {
    dx: number;
    dy: number;
  };
  canvas: TCanvasSummary;
  matchedCount: number;
  matchedIds: string[];
  changedCount: number;
  changedIds: string[];
};

function printMoveHelp(): void {
  console.log(`Usage: vibecanvas canvas move [options]

Move explicit element or group ids inside one selected canvas.

Required canvas selector (choose exactly one):
  --canvas <id>             Select one canvas by exact canvas row id
  --canvas-name <query>     Select one canvas by unique case-insensitive name substring

Required target selector:
  --id <id>                 Exact element/group id to move (repeatable)

Required mode (choose exactly one):
  --relative                Treat --x/--y as translation deltas
  --absolute                Treat --x/--y as the final target position

Required coordinates:
  --x <number>              Horizontal delta or absolute x target
  --y <number>              Vertical delta or absolute y target

Options:
  --db <path>               Optional explicit SQLite file override for the opened db
  --json                    Emit machine-readable success/error payloads
  --help, -h                Show this help message

Output:
  Text mode prints the move summary and changed ids.
  JSON mode prints { ok, command, mode, input, delta, canvas, matchedCount, matchedIds, changedCount, changedIds }.

Notes:
  - repeated --id values move many targets while preserving relative positions.
  - group ids move their descendant elements; groups themselves do not store x/y positions.
  - overlapping targets are normalized so each changed element moves at most once.
  - --absolute currently requires exactly one target id.
`);
}

function exitWithMoveJsonError(error: TMoveJsonError): never {
  console.error(JSON.stringify(error));
  process.exit(1);
}

function exitWithMoveTextError(message: string): never {
  console.error(message);
  process.exit(1);
}

function exitMoveError(wantsJson: boolean, error: TMoveJsonError): never {
  if (wantsJson) exitWithMoveJsonError(error);
  exitWithMoveTextError(error.message);
}

function parseCoordinate(args: {
  raw: unknown;
  flag: "--x" | "--y";
  wantsJson: boolean;
  canvasId: string | null;
  canvasNameQuery: string | null;
}): number {
  if (typeof args.raw === "string" && args.raw.trim().length > 0) {
    const numeric = Number(args.raw);
    if (Number.isFinite(numeric)) return numeric;
  }

  exitMoveError(args.wantsJson, {
    ok: false,
    command: "canvas.move",
    code: "CANVAS_MOVE_COORDINATE_INVALID",
    message: `Invalid ${args.flag} value '${String(args.raw)}'. Expected a finite number.`,
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
  });
}

function parseMoveMode(args: {
  values: Record<string, unknown>;
  wantsJson: boolean;
  canvasId: string | null;
  canvasNameQuery: string | null;
}): { mode: TMoveMode; x: number; y: number } {
  const relative = Boolean(args.values.relative);
  const absolute = Boolean(args.values.absolute);

  if (relative === absolute) {
    exitMoveError(args.wantsJson, {
      ok: false,
      command: "canvas.move",
      code: "CANVAS_MOVE_MODE_REQUIRED",
      message: "Pass exactly one move mode: --relative or --absolute.",
      canvasId: args.canvasId,
      canvasNameQuery: args.canvasNameQuery,
    });
  }

  return {
    mode: relative ? "relative" : "absolute",
    x: parseCoordinate({ raw: args.values.x, flag: "--x", wantsJson: args.wantsJson, canvasId: args.canvasId, canvasNameQuery: args.canvasNameQuery }),
    y: parseCoordinate({ raw: args.values.y, flag: "--y", wantsJson: args.wantsJson, canvasId: args.canvasId, canvasNameQuery: args.canvasNameQuery }),
  };
}

function parseMoveIds(args: {
  raw: unknown;
  wantsJson: boolean;
  canvasId: string | null;
  canvasNameQuery: string | null;
}): string[] {
  const values = Array.isArray(args.raw) ? args.raw : args.raw === undefined ? [] : [args.raw];
  const ids = sortIds([...new Set(values.flatMap((value) => typeof value === "string" ? value.split(",") : []).map((value) => value.trim()).filter(Boolean))]);
  if (ids.length > 0) return ids;

  exitMoveError(args.wantsJson, {
    ok: false,
    command: "canvas.move",
    code: "CANVAS_MOVE_ID_REQUIRED",
    message: "Move requires at least one --id <id> target.",
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
  });
}

function createTargetFromId(doc: TCanvasDoc, id: string): TSceneTarget | null {
  if (doc.groups[id]) return { kind: "group", group: doc.groups[id]! };
  if (doc.elements[id]) return { kind: "element", element: doc.elements[id]! };
  return null;
}

function resolveTargetsByIds(args: {
  doc: TCanvasDoc;
  ids: string[];
  wantsJson: boolean;
  canvasId: string;
  canvasNameQuery: string | null;
}): TSceneTarget[] {
  const targets = args.ids.map((id) => createTargetFromId(args.doc, id));
  const missingIds = args.ids.filter((id, index) => targets[index] === null);
  if (missingIds.length === 0) return targets.filter((target): target is TSceneTarget => target !== null);

  exitMoveError(args.wantsJson, {
    ok: false,
    command: "canvas.move",
    code: "CANVAS_MOVE_TARGET_NOT_FOUND",
    message: `Target ids were not found in canvas '${args.doc.name}': ${sortIds(missingIds).join(", ")}.`,
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
  });
}

function collectGroupDescendantElementIds(doc: TCanvasDoc, groupId: string): string[] {
  const pending = [groupId];
  const visited = new Set<string>();
  const elementIds = new Set<string>();

  while (pending.length > 0) {
    const currentGroupId = pending.shift();
    if (!currentGroupId || visited.has(currentGroupId)) continue;
    visited.add(currentGroupId);

    for (const element of Object.values(doc.elements)) {
      if (element.parentGroupId === currentGroupId) elementIds.add(element.id);
    }

    for (const group of Object.values(doc.groups)) {
      if (group.parentGroupId === currentGroupId) pending.push(group.id);
    }
  }

  return [...elementIds];
}

function collectChangedElementIds(doc: TCanvasDoc, targets: readonly TSceneTarget[]): string[] {
  const changedIds = new Set<string>();

  for (const target of targets) {
    if (target.kind === "element") {
      changedIds.add(target.element.id);
      continue;
    }

    for (const elementId of collectGroupDescendantElementIds(doc, target.group.id)) {
      changedIds.add(elementId);
    }
  }

  return sortIds([...changedIds]);
}

function resolveAbsoluteDelta(args: {
  doc: TCanvasDoc;
  target: TSceneTarget;
  x: number;
  y: number;
  wantsJson: boolean;
  canvasId: string;
  canvasNameQuery: string | null;
}): { dx: number; dy: number } {
  if (args.target.kind === "element") {
    return { dx: args.x - args.target.element.x, dy: args.y - args.target.element.y };
  }

  const bounds = getTargetBounds(args.doc, args.target);
  if (bounds) {
    return { dx: args.x - bounds.x, dy: args.y - bounds.y };
  }

  exitMoveError(args.wantsJson, {
    ok: false,
    command: "canvas.move",
    code: "CANVAS_MOVE_TARGET_NOT_POSITIONABLE",
    message: `Group '${args.target.group.id}' cannot be moved absolutely because it has no descendant element bounds.`,
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
  });
}

function renderMoveTextResult(result: TMoveJsonSuccess): string {
  const changedLabel = result.changedCount === 1 ? "element" : "elements";
  const matchedLabel = result.matchedCount === 1 ? "target" : "targets";
  return `Moved ${result.changedCount} ${changedLabel} from ${result.matchedCount} matched ${matchedLabel} in canvas=${result.canvas.id} name=${JSON.stringify(result.canvas.name)} mode=${result.mode} x=${result.input.x} y=${result.input.y} delta=${JSON.stringify(result.delta)} changedIds=${JSON.stringify(result.changedIds)}\n`;
}

export async function runCanvasMove(argv: readonly string[]): Promise<never> {
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
      relative: { type: "boolean", default: false },
      absolute: { type: "boolean", default: false },
      x: { type: "string" },
      y: { type: "string" },
    },
  });

  const wantsJson = Boolean(values.json);
  const canvasId = typeof values.canvas === "string" ? values.canvas : null;
  const canvasNameQuery = typeof values["canvas-name"] === "string" ? values["canvas-name"] : null;

  if (values.help) {
    printMoveHelp();
    process.exit(0);
  }

  const move = parseMoveMode({ values, wantsJson, canvasId, canvasNameQuery });
  const ids = parseMoveIds({ raw: values.id, wantsJson, canvasId, canvasNameQuery });

  try {
    const { db, dbPath } = await runSilently(() => openOfflineCanvasState());
    const rows = db.query.canvas.findMany().sync() as TCanvasRow[];
    const selectedCanvas = resolveCanvasSelection({
      rows,
      selector: { canvasId, canvasNameQuery },
      wantsJson,
      command: "canvas.move",
      actionLabel: "Move",
      fail: (error) => exitMoveError(wantsJson, error as TMoveJsonError),
    });
    const doc = await runSilently(() => loadCanvasDoc(selectedCanvas));
    const matchedTargets = resolveTargetsByIds({ doc, ids, wantsJson, canvasId: selectedCanvas.id, canvasNameQuery });

    if (move.mode === "absolute" && matchedTargets.length !== 1) {
      exitMoveError(wantsJson, {
        ok: false,
        command: "canvas.move",
        code: "CANVAS_MOVE_ABSOLUTE_REQUIRES_SINGLE_TARGET",
        message: "Absolute move currently requires exactly one target id.",
        canvasId: selectedCanvas.id,
        canvasNameQuery,
      });
    }

    const delta = move.mode === "relative"
      ? { dx: move.x, dy: move.y }
      : resolveAbsoluteDelta({ doc, target: matchedTargets[0]!, x: move.x, y: move.y, wantsJson, canvasId: selectedCanvas.id, canvasNameQuery });

    const matchedIds = ids;
    const changedIds = collectChangedElementIds(doc, matchedTargets);
    const resolvedHandle = await runSilently(() => loadCanvasHandle(selectedCanvas));
    const handle = resolvedHandle.handle;
    const now = Date.now();

    handle.change((nextDoc) => {
      for (const changedId of changedIds) {
        const element = nextDoc.elements[changedId];
        if (!element) continue;
        element.x += delta.dx;
        element.y += delta.dy;
        element.updatedAt = now;
      }
    });

    const predicate = (persistedDoc: TCanvasDoc) => changedIds.every((changedId) => persistedDoc.elements[changedId] && persistedDoc.elements[changedId]!.x === (doc.elements[changedId]?.x ?? 0) + delta.dx && persistedDoc.elements[changedId]!.y === (doc.elements[changedId]?.y ?? 0) + delta.dy);

    if (resolvedHandle.source === "live") {
      await waitForLiveCanvasDoc({ automergeUrl: selectedCanvas.automerge_url, predicate });
    } else {
      await waitForPersistedCanvasDoc({ databasePath: dbPath, automergeUrl: selectedCanvas.automerge_url, predicate });
    }

    const result: TMoveJsonSuccess = {
      ok: true,
      command: "canvas.move",
      mode: move.mode,
      input: { x: move.x, y: move.y },
      delta,
      canvas: normalizeCanvas(selectedCanvas),
      matchedCount: matchedIds.length,
      matchedIds,
      changedCount: changedIds.length,
      changedIds,
    };

    if (wantsJson) {
      console.log(JSON.stringify(result));
      process.exit(0);
    }

    process.stdout.write(renderMoveTextResult(result));
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    exitMoveError(wantsJson, {
      ok: false,
      command: "canvas.move",
      code: "CANVAS_BOOTSTRAP_FAILED",
      message,
      canvasId,
      canvasNameQuery,
    });
  }
}
