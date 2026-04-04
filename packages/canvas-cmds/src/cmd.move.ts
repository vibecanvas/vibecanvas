import type { TCanvasDoc } from '@vibecanvas/shell/automerge/index';
import type { TCanvasCmdContext, TCanvasRow } from './context';
import { normalizeCanvas } from './context';
import { toCanvasCmdError, throwCanvasCmdError, type TCanvasCmdErrorDetails } from './errors';
import { getTargetBounds, resolveCanvasSelection, sortIds, type TSceneTarget } from './scene-shared';

export type TMoveMode = 'relative' | 'absolute';

export type TCanvasMoveInput = {
  canvasId: string | null;
  canvasNameQuery: string | null;
  ids: string[];
  mode: TMoveMode;
  x: number;
  y: number;
};

export type TCanvasMoveSuccess = {
  ok: true;
  command: 'canvas.move';
  mode: TMoveMode;
  input: {
    x: number;
    y: number;
  };
  delta: {
    dx: number;
    dy: number;
  };
  canvas: ReturnType<typeof normalizeCanvas>;
  matchedCount: number;
  matchedIds: string[];
  changedCount: number;
  changedIds: string[];
};

function exitMoveError(error: TCanvasCmdErrorDetails): never {
  throwCanvasCmdError(error);
}

function ensureFiniteCoordinate(args: {
  value: number;
  flag: 'x' | 'y';
  canvasId: string | null;
  canvasNameQuery: string | null;
}): number {
  if (Number.isFinite(args.value)) return args.value;

  exitMoveError({
    ok: false,
    command: 'canvas.move',
    code: 'CANVAS_MOVE_COORDINATE_INVALID',
    message: `Invalid ${args.flag} coordinate. Expected a finite number.`,
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
  });
}

function normalizeMoveIds(args: {
  ids: string[];
  canvasId: string | null;
  canvasNameQuery: string | null;
}): string[] {
  const normalized = sortIds([...new Set(args.ids.map((value) => value.trim()).filter(Boolean))]);
  if (normalized.length > 0) return normalized;

  exitMoveError({
    ok: false,
    command: 'canvas.move',
    code: 'CANVAS_MOVE_ID_REQUIRED',
    message: 'Move requires at least one target id.',
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
  });
}

function createTargetFromId(doc: TCanvasDoc, id: string): TSceneTarget | null {
  if (doc.groups[id]) return { kind: 'group', group: doc.groups[id]! };
  if (doc.elements[id]) return { kind: 'element', element: doc.elements[id]! };
  return null;
}

function resolveTargetsByIds(args: {
  doc: TCanvasDoc;
  ids: string[];
  canvasId: string;
  canvasNameQuery: string | null;
}): TSceneTarget[] {
  const targets = args.ids.map((id) => createTargetFromId(args.doc, id));
  const missingIds = args.ids.filter((id, index) => targets[index] === null);
  if (missingIds.length === 0) return targets.filter((target): target is TSceneTarget => target !== null);

  exitMoveError({
    ok: false,
    command: 'canvas.move',
    code: 'CANVAS_MOVE_TARGET_NOT_FOUND',
    message: `Target ids were not found in canvas '${args.doc.name}': ${sortIds(missingIds).join(', ')}.`,
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
    if (target.kind === 'element') {
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
  canvasId: string;
  canvasNameQuery: string | null;
}): { dx: number; dy: number } {
  if (args.target.kind === 'element') {
    return { dx: args.x - args.target.element.x, dy: args.y - args.target.element.y };
  }

  const bounds = getTargetBounds(args.doc, args.target);
  if (bounds) {
    return { dx: args.x - bounds.x, dy: args.y - bounds.y };
  }

  exitMoveError({
    ok: false,
    command: 'canvas.move',
    code: 'CANVAS_MOVE_TARGET_NOT_POSITIONABLE',
    message: `Group '${args.target.group.id}' cannot be moved absolutely because it has no descendant element bounds.`,
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
  });
}

export async function executeCanvasMove(ctx: TCanvasCmdContext, input: TCanvasMoveInput): Promise<TCanvasMoveSuccess> {
  const canvasId = input.canvasId;
  const canvasNameQuery = input.canvasNameQuery;
  const ids = normalizeMoveIds({ ids: input.ids, canvasId, canvasNameQuery });
  const move = {
    mode: input.mode,
    x: ensureFiniteCoordinate({ value: input.x, flag: 'x', canvasId, canvasNameQuery }),
    y: ensureFiniteCoordinate({ value: input.y, flag: 'y', canvasId, canvasNameQuery }),
  };

  if (move.mode !== 'relative' && move.mode !== 'absolute') {
    exitMoveError({
      ok: false,
      command: 'canvas.move',
      code: 'CANVAS_MOVE_MODE_REQUIRED',
      message: 'Move mode must be either relative or absolute.',
      canvasId,
      canvasNameQuery,
    });
  }

  try {
    const rows = await ctx.listCanvasRows() as TCanvasRow[];
    const selectedCanvas = resolveCanvasSelection({
      rows,
      selector: { canvasId, canvasNameQuery },
      command: 'canvas.move',
      actionLabel: 'Move',
      fail: (error) => exitMoveError(error),
    });
    const resolvedHandle = await ctx.loadCanvasHandle(selectedCanvas);
    const currentDoc = resolvedHandle.handle.doc();
    if (!currentDoc) {
      throw new Error(`Canvas doc '${selectedCanvas.automerge_url}' is unavailable.`);
    }

    const doc = structuredClone(currentDoc);
    const matchedTargets = resolveTargetsByIds({ doc, ids, canvasId: selectedCanvas.id, canvasNameQuery });

    if (move.mode === 'absolute' && matchedTargets.length !== 1) {
      exitMoveError({
        ok: false,
        command: 'canvas.move',
        code: 'CANVAS_MOVE_ABSOLUTE_REQUIRES_SINGLE_TARGET',
        message: 'Absolute move currently requires exactly one target id.',
        canvasId: selectedCanvas.id,
        canvasNameQuery,
      });
    }

    const delta = move.mode === 'relative'
      ? { dx: move.x, dy: move.y }
      : resolveAbsoluteDelta({ doc, target: matchedTargets[0]!, x: move.x, y: move.y, canvasId: selectedCanvas.id, canvasNameQuery });

    const matchedIds = ids;
    const changedIds = collectChangedElementIds(doc, matchedTargets);
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

    await ctx.waitForMutation({
      source: resolvedHandle.source,
      handle,
      automergeUrl: selectedCanvas.automerge_url,
      predicate,
    });

    return {
      ok: true,
      command: 'canvas.move',
      mode: move.mode,
      input: { x: move.x, y: move.y },
      delta,
      canvas: normalizeCanvas(selectedCanvas),
      matchedCount: matchedIds.length,
      matchedIds,
      changedCount: changedIds.length,
      changedIds,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'CanvasCmdError') throw error;
    throw toCanvasCmdError({
      command: 'canvas.move',
      code: 'CANVAS_MOVE_FAILED',
      message: error instanceof Error ? error.message : String(error),
      canvasId,
      canvasNameQuery,
    });
  }
}
