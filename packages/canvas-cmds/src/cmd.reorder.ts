import type { TCanvasDoc, TElement, TGroup } from '@vibecanvas/shell/automerge/index';
import type { TCanvasCmdContext, TCanvasRow } from './context';
import { normalizeCanvas } from './context';
import { toCanvasCmdError, throwCanvasCmdError, type TCanvasCmdErrorDetails } from './errors';
import { resolveCanvasSelection, sortIds } from './scene-shared';

export const REORDER_ACTIONS = ['front', 'back', 'forward', 'backward'] as const;

export type TReorderAction = (typeof REORDER_ACTIONS)[number];

export type TReorderOrderEntry = {
  id: string;
  zIndex: string;
  kind: 'element' | 'group';
};

type TReorderTarget =
  | { kind: 'element'; element: TElement }
  | { kind: 'group'; group: TGroup };

export type TCanvasReorderInput = {
  canvasId: string | null;
  canvasNameQuery: string | null;
  ids: string[];
  action: TReorderAction;
};

export type TCanvasReorderSuccess = {
  ok: true;
  command: 'canvas.reorder';
  action: TReorderAction;
  canvas: ReturnType<typeof normalizeCanvas>;
  matchedCount: number;
  matchedIds: string[];
  parentGroupId: string | null;
  beforeOrder: TReorderOrderEntry[];
  afterOrder: TReorderOrderEntry[];
  changedIds: string[];
};

function exitReorderError(error: TCanvasCmdErrorDetails): never {
  throwCanvasCmdError(error);
}

// Deterministic padded z-index string, mirrors `createOrderedZIndex` in
// packages/canvas/src/plugins/shared/render-order.shared.ts (which imports Konva
// and therefore cannot be pulled into this node-only package).
function createOrderedZIndex(index: number): string {
  return `z${String(index).padStart(8, '0')}`;
}

function normalizeReorderIds(args: {
  ids: string[];
  canvasId: string | null;
  canvasNameQuery: string | null;
}): string[] {
  const normalized = sortIds([...new Set(args.ids.map((value) => value.trim()).filter(Boolean))]);
  if (normalized.length > 0) return normalized;

  exitReorderError({
    ok: false,
    command: 'canvas.reorder',
    code: 'CANVAS_REORDER_ID_REQUIRED',
    message: 'Reorder requires at least one --id <id> target.',
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
  });
}

function createTargetFromId(doc: TCanvasDoc, id: string): TReorderTarget | null {
  if (doc.groups[id]) return { kind: 'group', group: doc.groups[id]! };
  if (doc.elements[id]) return { kind: 'element', element: doc.elements[id]! };
  return null;
}

function resolveTargetsByIds(args: {
  doc: TCanvasDoc;
  ids: string[];
  canvasId: string;
  canvasNameQuery: string | null;
}): TReorderTarget[] {
  const targets = args.ids.map((id) => createTargetFromId(args.doc, id));
  const missingIds = args.ids.filter((_id, index) => targets[index] === null);
  if (missingIds.length === 0) return targets.filter((target): target is TReorderTarget => target !== null);

  exitReorderError({
    ok: false,
    command: 'canvas.reorder',
    code: 'CANVAS_REORDER_TARGET_NOT_FOUND',
    message: `Target ids were not found in canvas '${args.doc.name}': ${sortIds(missingIds).join(', ')}.`,
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
  });
}

function getParentGroupId(target: TReorderTarget): string | null {
  return target.kind === 'element' ? target.element.parentGroupId ?? null : target.group.parentGroupId ?? null;
}

function ensureSameParentGroupId(args: {
  targets: readonly TReorderTarget[];
  canvasId: string;
  canvasNameQuery: string | null;
}): string | null {
  const parentGroupIds = [...new Set(args.targets.map((target) => getParentGroupId(target)))];
  if (parentGroupIds.length === 1) return parentGroupIds[0] ?? null;

  exitReorderError({
    ok: false,
    command: 'canvas.reorder',
    code: 'CANVAS_REORDER_PARENT_MISMATCH',
    message: 'All reordered ids must share the same direct parentGroupId.',
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
  });
}

function getSiblingOrder(doc: TCanvasDoc, parentGroupId: string | null): TReorderOrderEntry[] {
  const entries: TReorderOrderEntry[] = [
    ...Object.values(doc.groups)
      .filter((group) => (group.parentGroupId ?? null) === parentGroupId)
      .map((group) => ({ id: group.id, zIndex: group.zIndex, kind: 'group' as const })),
    ...Object.values(doc.elements)
      .filter((element) => (element.parentGroupId ?? null) === parentGroupId)
      .map((element) => ({ id: element.id, zIndex: element.zIndex, kind: 'element' as const })),
  ];

  return entries.sort((left, right) => {
    const zCompare = left.zIndex.localeCompare(right.zIndex);
    if (zCompare !== 0) return zCompare;
    if (left.kind !== right.kind) return left.kind.localeCompare(right.kind);
    return left.id.localeCompare(right.id);
  });
}

function applyReorderAction(order: readonly TReorderOrderEntry[], selectedIds: readonly string[], action: TReorderAction): TReorderOrderEntry[] {
  const selected = new Set(selectedIds);
  const units = order.map((entry) => ({ entry, selected: selected.has(entry.id) }));

  if (action === 'front') {
    return [...units.filter((unit) => !unit.selected), ...units.filter((unit) => unit.selected)].map((unit) => unit.entry);
  }
  if (action === 'back') {
    return [...units.filter((unit) => unit.selected), ...units.filter((unit) => !unit.selected)].map((unit) => unit.entry);
  }

  // Index convention: units are sorted by zIndex ascending, so index 0 = back (lowest z)
  // and the final index = front (highest z). "forward" nudges selected items one step
  // toward the front (higher index); "backward" nudges them one step toward the back.
  const next = [...units];
  if (action === 'forward') {
    // Walk from top down so each selected item only moves up by one slot per pass.
    for (let index = next.length - 2; index >= 0; index -= 1) {
      if (next[index]!.selected && !next[index + 1]!.selected) {
        const swap = next[index]!;
        next[index] = next[index + 1]!;
        next[index + 1] = swap;
      }
    }
    return next.map((unit) => unit.entry);
  }

  for (let index = 1; index < next.length; index += 1) {
    if (next[index]!.selected && !next[index - 1]!.selected) {
      const swap = next[index]!;
      next[index] = next[index - 1]!;
      next[index - 1] = swap;
    }
  }
  return next.map((unit) => unit.entry);
}

export async function executeCanvasReorder(ctx: TCanvasCmdContext, input: TCanvasReorderInput): Promise<TCanvasReorderSuccess> {
  const canvasId = input.canvasId;
  const canvasNameQuery = input.canvasNameQuery;
  const ids = normalizeReorderIds({ ids: input.ids, canvasId, canvasNameQuery });

  if (!REORDER_ACTIONS.includes(input.action)) {
    exitReorderError({
      ok: false,
      command: 'canvas.reorder',
      code: 'CANVAS_REORDER_ACTION_INVALID',
      message: `Invalid --action '${String(input.action)}'. Expected one of: ${REORDER_ACTIONS.join(', ')}.`,
      canvasId,
      canvasNameQuery,
    });
  }

  try {
    const rows = await ctx.listCanvasRows() as TCanvasRow[];
    const selectedCanvas = resolveCanvasSelection({
      rows,
      selector: { canvasId, canvasNameQuery },
      command: 'canvas.reorder',
      actionLabel: 'Reorder',
      fail: (error) => exitReorderError(error),
    });
    const resolvedHandle = await ctx.loadCanvasHandle(selectedCanvas);
    const currentDoc = resolvedHandle.handle.doc();
    if (!currentDoc) {
      throw new Error(`Canvas doc '${selectedCanvas.automerge_url}' is unavailable.`);
    }

    const doc = structuredClone(currentDoc);
    const matchedTargets = resolveTargetsByIds({ doc, ids, canvasId: selectedCanvas.id, canvasNameQuery });
    const parentGroupId = ensureSameParentGroupId({ targets: matchedTargets, canvasId: selectedCanvas.id, canvasNameQuery });
    const beforeOrder = getSiblingOrder(doc, parentGroupId);
    const reorderedUnindexed = applyReorderAction(beforeOrder, ids, input.action);

    const sameOrder = beforeOrder.length === reorderedUnindexed.length
      && beforeOrder.every((entry, index) => entry.id === reorderedUnindexed[index]?.id);
    if (sameOrder) {
      exitReorderError({
        ok: false,
        command: 'canvas.reorder',
        code: 'CANVAS_REORDER_NO_OP',
        message: 'Reorder would not change sibling order for the requested action.',
        canvasId: selectedCanvas.id,
        canvasNameQuery,
      });
    }

    const afterOrder = reorderedUnindexed.map((entry, index) => ({ ...entry, zIndex: createOrderedZIndex(index) }));
    const changedIds = sortIds(
      afterOrder
        .filter((entry, index) => beforeOrder[index]?.id !== entry.id || beforeOrder[index]?.zIndex !== entry.zIndex)
        .map((entry) => entry.id),
    );
    const handle = resolvedHandle.handle;

    handle.change((nextDoc) => {
      for (const entry of afterOrder) {
        if (entry.kind === 'group') {
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
      return persistedOrder.length === afterOrder.length
        && persistedOrder.every((entry, index) => entry.id === afterOrder[index]?.id && entry.zIndex === afterOrder[index]?.zIndex && entry.kind === afterOrder[index]?.kind);
    };

    await ctx.waitForMutation({
      source: resolvedHandle.source,
      handle,
      automergeUrl: selectedCanvas.automerge_url,
      predicate,
    });

    return {
      ok: true,
      command: 'canvas.reorder',
      action: input.action,
      canvas: normalizeCanvas(selectedCanvas),
      matchedCount: ids.length,
      matchedIds: ids,
      parentGroupId,
      beforeOrder,
      afterOrder,
      changedIds,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'CanvasCmdError') throw error;
    throw toCanvasCmdError({
      command: 'canvas.reorder',
      code: 'CANVAS_REORDER_FAILED',
      message: error instanceof Error ? error.message : String(error),
      canvasId,
      canvasNameQuery,
    });
  }
}
