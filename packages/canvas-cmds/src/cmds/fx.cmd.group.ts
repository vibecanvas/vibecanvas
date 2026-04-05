import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import type { TCanvasDoc, TElement, TGroup } from '@vibecanvas/automerge-service/types/canvas-doc';
import type { IDbService, TCanvasRecord } from '@vibecanvas/db/IDbService';
import { toIsoString } from '../core/fn.conversion';
import type { TCanvasCmdErrorDetails } from '../types';

export type TCanvasSummary = {
  id: string;
  name: string;
  automergeUrl: string;
  createdAt: string;
};

export type TCanvasGroupInput = {
  canvasId: string | null;
  canvasNameQuery: string | null;
  ids: string[];
};

export type TCanvasGroupSuccess = {
  ok: true;
  command: 'canvas.group';
  canvas: TCanvasSummary;
  matchedCount: number;
  matchedIds: string[];
  group: {
    id: string;
    parentGroupId: string | null;
    childIds: string[];
  };
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
    throwCanvasError({ ok: false, command: 'canvas.group', code: 'CANVAS_SELECTOR_CONFLICT', message: 'Pass exactly one canvas selector: use either canvasId or canvasNameQuery.', canvasId: input.canvasId, canvasNameQuery: input.canvasNameQuery });
  }

  if (!input.canvasId && !input.canvasNameQuery) {
    throwCanvasError({ ok: false, command: 'canvas.group', code: 'CANVAS_SELECTOR_REQUIRED', message: 'Group requires one canvas selector. Pass canvasId or canvasNameQuery.', canvasId: null, canvasNameQuery: null });
  }

  if (input.canvasId) {
    const match = rows.find((row) => row.id === input.canvasId);
    if (match) return match;
    throwCanvasError({ ok: false, command: 'canvas.group', code: 'CANVAS_SELECTOR_NOT_FOUND', message: `Canvas '${input.canvasId}' was not found.`, canvasId: input.canvasId, canvasNameQuery: null });
  }

  const query = input.canvasNameQuery?.trim() ?? '';
  const matches = rows.filter((row) => row.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  if (matches.length === 1) return matches[0]!;
  if (matches.length === 0) {
    throwCanvasError({ ok: false, command: 'canvas.group', code: 'CANVAS_SELECTOR_NOT_FOUND', message: `Canvas name query '${query}' did not match any canvas.`, canvasId: null, canvasNameQuery: query });
  }

  throwCanvasError({
    ok: false,
    command: 'canvas.group',
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

function parseGroupIds(input: TCanvasGroupInput): string[] {
  const ids = sortIds([...new Set(input.ids.map((value) => value.trim()).filter(Boolean))]);
  if (ids.length >= 2) return ids;
  throwCanvasError({
    ok: false,
    command: 'canvas.group',
    code: 'CANVAS_GROUP_ID_REQUIRED',
    message: 'Group requires at least two ids.',
    canvasId: input.canvasId,
    canvasNameQuery: input.canvasNameQuery,
  });
}

function resolveElementsByIds(doc: TCanvasDoc, ids: string[], canvasId: string, canvasNameQuery: string | null): TElement[] {
  const missingIds = ids.filter((id) => !doc.elements[id] && !doc.groups[id]);
  if (missingIds.length > 0) {
    throwCanvasError({
      ok: false,
      command: 'canvas.group',
      code: 'CANVAS_GROUP_TARGET_NOT_FOUND',
      message: `Target ids were not found in canvas '${doc.name}': ${sortIds(missingIds).join(', ')}.`,
      canvasId,
      canvasNameQuery,
    });
  }

  const groupIds = ids.filter((id) => Boolean(doc.groups[id]));
  if (groupIds.length > 0) {
    throwCanvasError({
      ok: false,
      command: 'canvas.group',
      code: 'CANVAS_GROUP_TARGET_KIND_INVALID',
      message: `Grouping currently supports element ids only. Received group ids: ${sortIds(groupIds).join(', ')}.`,
      canvasId,
      canvasNameQuery,
    });
  }

  return ids.map((id) => doc.elements[id]!).filter(Boolean);
}

function ensureSameParentGroupId(elements: readonly TElement[], canvasId: string, canvasNameQuery: string | null): string | null {
  const parentGroupIds = [...new Set(elements.map((element) => element.parentGroupId ?? null))];
  if (parentGroupIds.length === 1) return parentGroupIds[0] ?? null;
  throwCanvasError({
    ok: false,
    command: 'canvas.group',
    code: 'CANVAS_GROUP_PARENT_MISMATCH',
    message: 'All grouped ids must share the same direct parentGroupId.',
    canvasId,
    canvasNameQuery,
  });
}

export async function fxExecuteCanvasGroup(portal: TPortal, input: TCanvasGroupInput): Promise<TCanvasGroupSuccess> {
  try {
    const ids = parseGroupIds(input);
    const selectedCanvas = resolveCanvasSelection(portal.dbService.canvas.listAll(), input);
    const handle = await portal.automergeService.repo.find<TCanvasDoc>(selectedCanvas.automerge_url as never);
    await handle.whenReady();
    const currentDoc = handle.doc();
    if (!currentDoc) throw new Error(`Canvas doc '${selectedCanvas.automerge_url}' is unavailable.`);

    const doc = structuredClone(currentDoc);
    const matchedElements = resolveElementsByIds(doc, ids, selectedCanvas.id, input.canvasNameQuery);
    const parentGroupId = ensureSameParentGroupId(matchedElements, selectedCanvas.id, input.canvasNameQuery);
    const groupId = crypto.randomUUID();
    const childIds = sortIds(matchedElements.map((element) => element.id));
    const maxCreatedAt = matchedElements.reduce((max, element) => Math.max(max, element.createdAt ?? 0, element.updatedAt ?? 0), 0);
    const createdAt = Math.max(Date.now(), maxCreatedAt + 1);
    const zIndex = matchedElements.map((element) => element.zIndex).sort((left, right) => left.localeCompare(right))[0] ?? 'a0';
    const newGroup: TGroup = { id: groupId, parentGroupId, zIndex, locked: false, createdAt };
    const now = Date.now();

    handle.change((nextDoc) => {
      nextDoc.groups[groupId] = structuredClone(newGroup);
      for (const childId of childIds) {
        const element = nextDoc.elements[childId];
        if (!element) continue;
        element.parentGroupId = groupId;
        element.updatedAt = now;
      }
    });

    return {
      ok: true,
      command: 'canvas.group',
      canvas: normalizeCanvas(selectedCanvas),
      matchedCount: childIds.length,
      matchedIds: childIds,
      group: {
        id: groupId,
        parentGroupId,
        childIds,
      },
    };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'ok' in error && 'code' in error) throw error;
    throw {
      ok: false,
      command: 'canvas.group',
      code: 'CANVAS_GROUP_FAILED',
      message: error instanceof Error ? error.message : String(error),
      canvasId: input.canvasId,
      canvasNameQuery: input.canvasNameQuery,
    } satisfies TCanvasCmdErrorDetails;
  }
}
