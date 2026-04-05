import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import type { TCanvasDoc, TGroup } from '@vibecanvas/automerge-service/types/canvas-doc';
import type { IDbService, TCanvasRecord } from '@vibecanvas/db/IDbService';
import { toIsoString } from '../core/fn.conversion';
import type { TCanvasCmdErrorDetails } from '../types';

export type TCanvasSummary = {
  id: string;
  name: string;
  automergeUrl: string;
  createdAt: string;
};

export type TCanvasUngroupInput = {
  canvasId: string | null;
  canvasNameQuery: string | null;
  ids: string[];
};

export type TCanvasUngroupSuccess = {
  ok: true;
  command: 'canvas.ungroup';
  canvas: TCanvasSummary;
  matchedCount: number;
  matchedIds: string[];
  removedGroupCount: number;
  removedGroupIds: string[];
  releasedChildCount: number;
  releasedChildIds: string[];
};

export type TPortal = {
  dbService: IDbService;
  automergeService: IAutomergeService;
};

function normalizeCanvas(row: TCanvasRecord): TCanvasSummary {
  return {
    id: row.id,
    name: row.name,
    automergeUrl: row.automerge_url,
    createdAt: toIsoString(row.created_at),
  };
}

function sortIds(values: readonly string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function throwCanvasError(details: TCanvasCmdErrorDetails): never {
  throw details;
}

function resolveCanvasSelection(rows: TCanvasRecord[], input: { canvasId: string | null; canvasNameQuery: string | null }): TCanvasRecord {
  if (input.canvasId && input.canvasNameQuery) {
    throwCanvasError({ ok: false, command: 'canvas.ungroup', code: 'CANVAS_SELECTOR_CONFLICT', message: 'Pass exactly one canvas selector: use either canvasId or canvasNameQuery.', canvasId: input.canvasId, canvasNameQuery: input.canvasNameQuery });
  }

  if (!input.canvasId && !input.canvasNameQuery) {
    throwCanvasError({ ok: false, command: 'canvas.ungroup', code: 'CANVAS_SELECTOR_REQUIRED', message: 'Ungroup requires one canvas selector. Pass canvasId or canvasNameQuery.', canvasId: null, canvasNameQuery: null });
  }

  if (input.canvasId) {
    const match = rows.find((row) => row.id === input.canvasId);
    if (match) return match;
    throwCanvasError({ ok: false, command: 'canvas.ungroup', code: 'CANVAS_SELECTOR_NOT_FOUND', message: `Canvas '${input.canvasId}' was not found.`, canvasId: input.canvasId, canvasNameQuery: null });
  }

  const query = input.canvasNameQuery?.trim() ?? '';
  const matches = rows.filter((row) => row.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  if (matches.length === 1) return matches[0]!;
  if (matches.length === 0) {
    throwCanvasError({ ok: false, command: 'canvas.ungroup', code: 'CANVAS_SELECTOR_NOT_FOUND', message: `Canvas name query '${query}' did not match any canvas.`, canvasId: null, canvasNameQuery: query });
  }

  throwCanvasError({
    ok: false,
    command: 'canvas.ungroup',
    code: 'CANVAS_SELECTOR_AMBIGUOUS',
    message: `Canvas name query '${query}' matched ${matches.length} canvases. Pass canvasId instead.`,
    canvasId: null,
    canvasNameQuery: query,
    matches: sortIds(matches.map((row) => row.name)).map((name) => {
      const row = matches.find((candidate) => candidate.name === name)!;
      return { id: row.id, name: row.name };
    }),
  });
}

function parseUngroupIds(input: TCanvasUngroupInput): string[] {
  const ids = sortIds([...new Set(input.ids.map((value) => value.trim()).filter(Boolean))]);
  if (ids.length > 0) return ids;
  throwCanvasError({
    ok: false,
    command: 'canvas.ungroup',
    code: 'CANVAS_UNGROUP_ID_REQUIRED',
    message: 'Ungroup requires at least one id.',
    canvasId: input.canvasId,
    canvasNameQuery: input.canvasNameQuery,
  });
}

function resolveGroupsByIds(doc: TCanvasDoc, ids: string[], canvasId: string, canvasNameQuery: string | null): TGroup[] {
  const missingIds = ids.filter((id) => !doc.elements[id] && !doc.groups[id]);
  if (missingIds.length > 0) {
    throwCanvasError({
      ok: false,
      command: 'canvas.ungroup',
      code: 'CANVAS_UNGROUP_TARGET_NOT_FOUND',
      message: `Target ids were not found in canvas '${doc.name}': ${sortIds(missingIds).join(', ')}.`,
      canvasId,
      canvasNameQuery,
    });
  }

  const elementIds = ids.filter((id) => Boolean(doc.elements[id]));
  if (elementIds.length > 0) {
    throwCanvasError({
      ok: false,
      command: 'canvas.ungroup',
      code: 'CANVAS_UNGROUP_TARGET_KIND_INVALID',
      message: `Ungroup currently supports group ids only. Received element ids: ${sortIds(elementIds).join(', ')}.`,
      canvasId,
      canvasNameQuery,
    });
  }

  return ids.map((id) => doc.groups[id]!).filter(Boolean);
}

function collectDirectChildIds(doc: TCanvasDoc, groupIds: readonly string[]): { releasedElementIds: string[]; reparentedGroupIds: string[] } {
  const releasedElementIds = new Set<string>();
  const reparentedGroupIds = new Set<string>();

  for (const groupId of groupIds) {
    for (const element of Object.values(doc.elements)) {
      if (element.parentGroupId === groupId) releasedElementIds.add(element.id);
    }

    for (const group of Object.values(doc.groups)) {
      if (group.parentGroupId === groupId && !groupIds.includes(group.id)) reparentedGroupIds.add(group.id);
    }
  }

  return {
    releasedElementIds: sortIds([...releasedElementIds]),
    reparentedGroupIds: sortIds([...reparentedGroupIds]),
  };
}

export async function fxExecuteCanvasUngroup(portal: TPortal, input: TCanvasUngroupInput): Promise<TCanvasUngroupSuccess> {
  try {
    const ids = parseUngroupIds(input);
    const selectedCanvas = resolveCanvasSelection(portal.dbService.canvas.listAll(), input);
    const handle = await portal.automergeService.repo.find<TCanvasDoc>(selectedCanvas.automerge_url as never);
    await handle.whenReady();
    const currentDoc = handle.doc();
    if (!currentDoc) throw new Error(`Canvas doc '${selectedCanvas.automerge_url}' is unavailable.`);

    const doc = structuredClone(currentDoc);
    const matchedGroups = resolveGroupsByIds(doc, ids, selectedCanvas.id, input.canvasNameQuery);
    const removedGroupIds = sortIds(matchedGroups.map((group) => group.id));
    const groupParentMap = new Map(matchedGroups.map((group) => [group.id, group.parentGroupId ?? null]));
    const { releasedElementIds } = collectDirectChildIds(doc, removedGroupIds);
    const now = Date.now();

    handle.change((nextDoc) => {
      for (const removedGroupId of removedGroupIds) {
        const parentGroupId = groupParentMap.get(removedGroupId) ?? null;

        for (const element of Object.values(nextDoc.elements)) {
          if (element.parentGroupId !== removedGroupId) continue;
          element.parentGroupId = parentGroupId;
          element.updatedAt = now;
        }

        for (const group of Object.values(nextDoc.groups)) {
          if (group.id === removedGroupId) continue;
          if (group.parentGroupId !== removedGroupId) continue;
          if (groupParentMap.has(group.id)) continue;
          group.parentGroupId = parentGroupId;
        }

        delete nextDoc.groups[removedGroupId];
      }
    });

    return {
      ok: true,
      command: 'canvas.ungroup',
      canvas: normalizeCanvas(selectedCanvas),
      matchedCount: removedGroupIds.length,
      matchedIds: removedGroupIds,
      removedGroupCount: removedGroupIds.length,
      removedGroupIds,
      releasedChildCount: releasedElementIds.length,
      releasedChildIds: releasedElementIds,
    };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'ok' in error && 'code' in error) throw error;
    throw {
      ok: false,
      command: 'canvas.ungroup',
      code: 'CANVAS_UNGROUP_FAILED',
      message: error instanceof Error ? error.message : String(error),
      canvasId: input.canvasId,
      canvasNameQuery: input.canvasNameQuery,
    } satisfies TCanvasCmdErrorDetails;
  }
}
