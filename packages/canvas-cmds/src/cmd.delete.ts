import type { TCanvasDoc } from '@vibecanvas/shell/automerge/index';
import type { TCanvasCmdContext, TCanvasRow } from './context';
import { normalizeCanvas } from './context';
import { toCanvasCmdError, throwCanvasCmdError, type TCanvasCmdErrorDetails } from './errors';
import { resolveCanvasSelection, sortIds, type TSceneTarget } from './scene-shared';

export type TDeleteEffectsMode = 'doc-only' | 'with-effects-if-available';

export type TCanvasDeleteInput = {
  canvasId: string | null;
  canvasNameQuery: string | null;
  ids: string[];
  effectsMode: TDeleteEffectsMode;
};

export type TCanvasDeleteSkippedEffect = {
  id: string;
  effect: string;
  reason: string;
};

export type TCanvasDeleteSuccess = {
  ok: true;
  command: 'canvas.delete';
  effectsMode: TDeleteEffectsMode;
  canvas: ReturnType<typeof normalizeCanvas>;
  matchedCount: number;
  matchedIds: string[];
  deletedElementIds: string[];
  deletedGroupIds: string[];
  skippedEffects: TCanvasDeleteSkippedEffect[];
  warnings: string[];
};

function exitDeleteError(error: TCanvasCmdErrorDetails): never {
  throwCanvasCmdError(error);
}

function normalizeDeleteIds(args: {
  ids: string[];
  canvasId: string | null;
  canvasNameQuery: string | null;
}): string[] {
  const normalized = sortIds([...new Set(args.ids.map((value) => value.trim()).filter(Boolean))]);
  if (normalized.length > 0) return normalized;

  exitDeleteError({
    ok: false,
    command: 'canvas.delete',
    code: 'CANVAS_DELETE_ID_REQUIRED',
    message: 'Delete requires at least one --id <id> target.',
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
  const missingIds = args.ids.filter((_id, index) => targets[index] === null);
  if (missingIds.length === 0) return targets.filter((target): target is TSceneTarget => target !== null);

  exitDeleteError({
    ok: false,
    command: 'canvas.delete',
    code: 'CANVAS_DELETE_TARGET_NOT_FOUND',
    message: `Target ids were not found in canvas '${args.doc.name}': ${sortIds(missingIds).join(', ')}.`,
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
  });
}

function collectCascade(doc: TCanvasDoc, targets: readonly TSceneTarget[]): { elementIds: string[]; groupIds: string[] } {
  const elementIds = new Set<string>();
  const groupIds = new Set<string>();
  const pendingGroups: string[] = [];

  for (const target of targets) {
    if (target.kind === 'element') {
      elementIds.add(target.element.id);
      continue;
    }
    if (!groupIds.has(target.group.id)) {
      groupIds.add(target.group.id);
      pendingGroups.push(target.group.id);
    }
  }

  // Walk the group subtree: every descendant group and every element under any visited group.
  while (pendingGroups.length > 0) {
    const currentGroupId = pendingGroups.shift()!;
    for (const element of Object.values(doc.elements)) {
      if (element.parentGroupId === currentGroupId) elementIds.add(element.id);
    }
    for (const group of Object.values(doc.groups)) {
      if (group.parentGroupId !== currentGroupId) continue;
      if (groupIds.has(group.id)) continue;
      groupIds.add(group.id);
      pendingGroups.push(group.id);
    }
  }

  return { elementIds: sortIds([...elementIds]), groupIds: sortIds([...groupIds]) };
}

function buildEffectsReport(args: { effectsMode: TDeleteEffectsMode; deletedElementIds: readonly string[] }): {
  skippedEffects: TCanvasDeleteSkippedEffect[];
  warnings: string[];
} {
  if (args.effectsMode === 'doc-only') return { skippedEffects: [], warnings: [] };

  // The offline CLI has no live plugin bus, so every element-level cleanup is skipped.
  // This gives agents a stable contract to detect the no-op and wire real effects later.
  const skippedEffects = args.deletedElementIds.map((id) => ({ id, effect: 'live-plugin-cleanup', reason: 'cli-offline' }));
  if (skippedEffects.length === 0) return { skippedEffects: [], warnings: [] };

  const label = skippedEffects.length === 1 ? 'plugin cleanup' : 'plugin cleanups';
  const warnings = [`Effects mode 'with-effects-if-available' is a no-op in offline CLI; ${skippedEffects.length} ${label} skipped.`];
  return { skippedEffects, warnings };
}

export async function executeCanvasDelete(ctx: TCanvasCmdContext, input: TCanvasDeleteInput): Promise<TCanvasDeleteSuccess> {
  const canvasId = input.canvasId;
  const canvasNameQuery = input.canvasNameQuery;
  const ids = normalizeDeleteIds({ ids: input.ids, canvasId, canvasNameQuery });

  if (input.effectsMode !== 'doc-only' && input.effectsMode !== 'with-effects-if-available') {
    exitDeleteError({
      ok: false,
      command: 'canvas.delete',
      code: 'CANVAS_DELETE_EFFECTS_MODE_INVALID',
      message: `Invalid effects mode '${String(input.effectsMode)}'. Expected 'doc-only' or 'with-effects-if-available'.`,
      canvasId,
      canvasNameQuery,
    });
  }

  try {
    const rows = await ctx.listCanvasRows() as TCanvasRow[];
    const selectedCanvas = resolveCanvasSelection({
      rows,
      selector: { canvasId, canvasNameQuery },
      command: 'canvas.delete',
      actionLabel: 'Delete',
      fail: (error) => exitDeleteError(error),
    });
    const resolvedHandle = await ctx.loadCanvasHandle(selectedCanvas);
    const currentDoc = resolvedHandle.handle.doc();
    if (!currentDoc) {
      throw new Error(`Canvas doc '${selectedCanvas.automerge_url}' is unavailable.`);
    }

    const doc = structuredClone(currentDoc);
    const matchedTargets = resolveTargetsByIds({ doc, ids, canvasId: selectedCanvas.id, canvasNameQuery });
    const cascade = collectCascade(doc, matchedTargets);
    const handle = resolvedHandle.handle;

    handle.change((nextDoc) => {
      for (const elementId of cascade.elementIds) {
        delete nextDoc.elements[elementId];
      }
      for (const groupId of cascade.groupIds) {
        delete nextDoc.groups[groupId];
      }
    });

    const predicate = (persistedDoc: TCanvasDoc) =>
      cascade.elementIds.every((id) => persistedDoc.elements[id] === undefined) &&
      cascade.groupIds.every((id) => persistedDoc.groups[id] === undefined);

    await ctx.waitForMutation({
      source: resolvedHandle.source,
      handle,
      automergeUrl: selectedCanvas.automerge_url,
      predicate,
    });

    const effects = buildEffectsReport({ effectsMode: input.effectsMode, deletedElementIds: cascade.elementIds });

    return {
      ok: true,
      command: 'canvas.delete',
      effectsMode: input.effectsMode,
      canvas: normalizeCanvas(selectedCanvas),
      matchedCount: ids.length,
      matchedIds: ids,
      deletedElementIds: cascade.elementIds,
      deletedGroupIds: cascade.groupIds,
      skippedEffects: effects.skippedEffects,
      warnings: effects.warnings,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'CanvasCmdError') throw error;
    throw toCanvasCmdError({
      command: 'canvas.delete',
      code: 'CANVAS_DELETE_FAILED',
      message: error instanceof Error ? error.message : String(error),
      canvasId,
      canvasNameQuery,
    });
  }
}
