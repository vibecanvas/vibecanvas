import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import type { TCanvasDoc, TElement, TGroup } from '@vibecanvas/automerge-service/types/canvas-doc';
import type { IDbService } from '@vibecanvas/db/IDbService';
import { fnNormalizeCanvas, fnResolveCanvasSelection, fnSortIds, type TCanvasSummary } from '../core/fn.canvas';
import { fnIsPlainObject } from '../core/fn.guard';
import { fxLoadCanvasHandleDoc } from '../core/fx.canvas';
import type { TCanvasCmdErrorDetails } from '../types';

export type TCanvasElementPatch = {
  x?: number;
  y?: number;
  rotation?: number;
  zIndex?: string;
  parentGroupId?: string | null;
  locked?: boolean;
  data?: Record<string, unknown>;
  style?: Record<string, unknown>;
};

export type TCanvasGroupPatch = {
  parentGroupId?: string | null;
  zIndex?: string;
  locked?: boolean;
};

export type TCanvasPatchEnvelope = {
  element?: TCanvasElementPatch;
  group?: TCanvasGroupPatch;
};

export type TCanvasPatchInput = {
  canvasId: string | null;
  canvasNameQuery: string | null;
  ids: string[];
  patch: TCanvasPatchEnvelope;
};

export type TCanvasPatchSuccess = {
  ok: true;
  command: 'canvas.patch';
  patch: TCanvasPatchEnvelope;
  canvas: TCanvasSummary;
  matchedCount: number;
  matchedIds: string[];
  changedCount: number;
  changedIds: string[];
};

export type TPortal = {
  dbService: IDbService;
  automergeService: IAutomergeService;
};

function validatePatchEnvelope(patch: TCanvasPatchEnvelope): void {
  if (!fnIsPlainObject(patch)) {
    throw { ok: false, command: 'canvas.patch', code: 'CANVAS_PATCH_PAYLOAD_INVALID', message: 'Patch payload must be an object.' } satisfies TCanvasCmdErrorDetails;
  }

  for (const key of Object.keys(patch)) {
    if (key !== 'element' && key !== 'group') {
      throw { ok: false, command: 'canvas.patch', code: 'CANVAS_PATCH_PAYLOAD_INVALID', message: `Unknown patch branch '${key}'.` } satisfies TCanvasCmdErrorDetails;
    }
  }

  if (!patch.element && !patch.group) {
    throw { ok: false, command: 'canvas.patch', code: 'CANVAS_PATCH_PAYLOAD_INVALID', message: 'Patch payload must include element or group.' } satisfies TCanvasCmdErrorDetails;
  }

  if (patch.element !== undefined) {
    if (!fnIsPlainObject(patch.element)) throw { ok: false, command: 'canvas.patch', code: 'CANVAS_PATCH_PAYLOAD_INVALID', message: "Patch payload field 'element' must be an object." } satisfies TCanvasCmdErrorDetails;
    for (const key of Object.keys(patch.element)) {
      if (!['x', 'y', 'rotation', 'zIndex', 'parentGroupId', 'locked', 'data', 'style'].includes(key)) {
        throw { ok: false, command: 'canvas.patch', code: 'CANVAS_PATCH_PAYLOAD_INVALID', message: `Unknown patch field 'element.${key}'.` } satisfies TCanvasCmdErrorDetails;
      }
    }
    if (patch.element.data !== undefined && !fnIsPlainObject(patch.element.data)) throw { ok: false, command: 'canvas.patch', code: 'CANVAS_PATCH_PAYLOAD_INVALID', message: "Patch payload field 'element.data' must be an object." } satisfies TCanvasCmdErrorDetails;
    if (patch.element.style !== undefined && !fnIsPlainObject(patch.element.style)) throw { ok: false, command: 'canvas.patch', code: 'CANVAS_PATCH_PAYLOAD_INVALID', message: "Patch payload field 'element.style' must be an object." } satisfies TCanvasCmdErrorDetails;
  }

  if (patch.group !== undefined) {
    if (!fnIsPlainObject(patch.group)) throw { ok: false, command: 'canvas.patch', code: 'CANVAS_PATCH_PAYLOAD_INVALID', message: "Patch payload field 'group' must be an object." } satisfies TCanvasCmdErrorDetails;
    for (const key of Object.keys(patch.group)) {
      if (!['parentGroupId', 'zIndex', 'locked'].includes(key)) {
        throw { ok: false, command: 'canvas.patch', code: 'CANVAS_PATCH_PAYLOAD_INVALID', message: `Unknown patch field 'group.${key}'.` } satisfies TCanvasCmdErrorDetails;
      }
    }
  }
}

function assertIds(input: TCanvasPatchInput): string[] {
  const ids = fnSortIds(input.ids.filter(Boolean));
  if (ids.length > 0) return ids;
  throw { ok: false, command: 'canvas.patch', code: 'CANVAS_PATCH_IDS_REQUIRED', message: 'Patch requires at least one id.', canvasId: input.canvasId, canvasNameQuery: input.canvasNameQuery } satisfies TCanvasCmdErrorDetails;
}

function getAllowedDataKeys(element: TElement): Set<string> {
  return new Set(Object.keys(element.data));
}

function validateElementPatchForTarget(element: TElement, patch: TCanvasElementPatch): void {
  if (!patch.data) return;
  const allowedKeys = getAllowedDataKeys(element);
  for (const key of Object.keys(patch.data)) {
    if (!allowedKeys.has(key)) {
      throw {
        ok: false,
        command: 'canvas.patch',
        code: 'CANVAS_PATCH_PAYLOAD_INVALID',
        message: `Patch field 'element.data.${key}' is invalid for element '${element.id}' of type '${element.data.type}'.`,
      } satisfies TCanvasCmdErrorDetails;
    }
  }
  if ('type' in patch.data && patch.data.type !== element.data.type) {
    throw {
      ok: false,
      command: 'canvas.patch',
      code: 'CANVAS_PATCH_PAYLOAD_INVALID',
      message: `Patch field 'element.data.type' cannot change element '${element.id}' type '${element.data.type}'.`,
    } satisfies TCanvasCmdErrorDetails;
  }
}

function assertParentGroupExists(doc: TCanvasDoc, parentGroupId: string | null | undefined, id: string, branch: 'element' | 'group'): void {
  if (parentGroupId === undefined || parentGroupId === null) return;
  if (doc.groups[parentGroupId]) return;
  throw {
    ok: false,
    command: 'canvas.patch',
    code: 'CANVAS_PATCH_PARENT_GROUP_NOT_FOUND',
    message: `Patch sets missing parent group '${parentGroupId}' on ${branch} '${id}'.`,
  } satisfies TCanvasCmdErrorDetails;
}

function wouldCreateGroupCycle(doc: TCanvasDoc, groupId: string, parentGroupId: string | null): boolean {
  let current = parentGroupId;
  const visited = new Set<string>();
  while (current) {
    if (current === groupId) return true;
    if (visited.has(current)) break;
    visited.add(current);
    current = doc.groups[current]?.parentGroupId ?? null;
  }
  return false;
}

function applyElementPatch(next: TElement, patch: TCanvasElementPatch, now: number): boolean {
  let changed = false;
  const assign = <K extends keyof TElement>(key: K, value: TElement[K] | undefined) => {
    if (value === undefined || next[key] === value) return;
    next[key] = value;
    changed = true;
  };

  assign('x', patch.x);
  assign('y', patch.y);
  assign('rotation', patch.rotation);
  assign('zIndex', patch.zIndex);
  assign('parentGroupId', patch.parentGroupId);
  assign('locked', patch.locked);

  if (patch.data) {
    for (const [key, value] of Object.entries(patch.data)) {
      if ((next.data as Record<string, unknown>)[key] === value) continue;
      (next.data as Record<string, unknown>)[key] = structuredClone(value);
      changed = true;
    }
  }

  if (patch.style) {
    for (const [key, value] of Object.entries(patch.style)) {
      if ((next.style as Record<string, unknown>)[key] === value) continue;
      (next.style as Record<string, unknown>)[key] = structuredClone(value);
      changed = true;
    }
  }

  if (changed) next.updatedAt = now;
  return changed;
}

function applyGroupPatch(next: TGroup, patch: TCanvasGroupPatch): boolean {
  let changed = false;
  if (patch.parentGroupId !== undefined && next.parentGroupId !== patch.parentGroupId) {
    next.parentGroupId = patch.parentGroupId;
    changed = true;
  }
  if (patch.zIndex !== undefined && next.zIndex !== patch.zIndex) {
    next.zIndex = patch.zIndex;
    changed = true;
  }
  if (patch.locked !== undefined && next.locked !== patch.locked) {
    next.locked = patch.locked;
    changed = true;
  }
  return changed;
}

export async function fxExecuteCanvasPatch(portal: TPortal, input: TCanvasPatchInput): Promise<TCanvasPatchSuccess> {
  try {
    validatePatchEnvelope(input.patch);
    const ids = assertIds(input);
    const selectedCanvas = fnResolveCanvasSelection({ rows: portal.dbService.canvas.listAll(), selector: input, command: 'canvas.patch', actionLabel: 'Patch' });
    const { handle, doc } = await fxLoadCanvasHandleDoc(portal, selectedCanvas);
    const matchedIds = ids.filter((id) => doc.elements[id] || doc.groups[id]);

    if (matchedIds.length !== ids.length) {
      const missingId = ids.find((id) => !doc.elements[id] && !doc.groups[id])!;
      throw {
        ok: false,
        command: 'canvas.patch',
        code: 'CANVAS_PATCH_TARGET_NOT_FOUND',
        message: `Target '${missingId}' was not found in canvas '${selectedCanvas.name}'.`,
        canvasId: selectedCanvas.id,
        canvasNameQuery: input.canvasNameQuery,
      } satisfies TCanvasCmdErrorDetails;
    }

    for (const id of matchedIds) {
      const element = doc.elements[id];
      const group = doc.groups[id];
      if (element && input.patch.group) throw { ok: false, command: 'canvas.patch', code: 'CANVAS_PATCH_PAYLOAD_INVALID', message: `Patch branch 'group' cannot target element '${id}'.` } satisfies TCanvasCmdErrorDetails;
      if (group && input.patch.element) throw { ok: false, command: 'canvas.patch', code: 'CANVAS_PATCH_PAYLOAD_INVALID', message: `Patch branch 'element' cannot target group '${id}'.` } satisfies TCanvasCmdErrorDetails;

      if (element && input.patch.element) {
        validateElementPatchForTarget(element, input.patch.element);
        assertParentGroupExists(doc, input.patch.element.parentGroupId, id, 'element');
      }

      if (group && input.patch.group) {
        assertParentGroupExists(doc, input.patch.group.parentGroupId, id, 'group');
        if (input.patch.group.parentGroupId !== undefined && wouldCreateGroupCycle(doc, id, input.patch.group.parentGroupId)) {
          throw { ok: false, command: 'canvas.patch', code: 'CANVAS_PATCH_GROUP_CYCLE', message: `Patch would create a group cycle for group '${id}'.` } satisfies TCanvasCmdErrorDetails;
        }
      }
    }

    const now = Date.now();
    const changedIds = new Set<string>();

    handle.change((nextDoc) => {
      for (const id of matchedIds) {
        const nextElement = nextDoc.elements[id];
        if (nextElement && input.patch.element) {
          if (applyElementPatch(nextElement, input.patch.element, now)) changedIds.add(id);
          continue;
        }
        const nextGroup = nextDoc.groups[id];
        if (nextGroup && input.patch.group) {
          if (applyGroupPatch(nextGroup, input.patch.group)) changedIds.add(id);
        }
      }
    });

    return {
      ok: true,
      command: 'canvas.patch',
      patch: input.patch,
      canvas: fnNormalizeCanvas(selectedCanvas),
      matchedCount: matchedIds.length,
      matchedIds,
      changedCount: changedIds.size,
      changedIds: fnSortIds([...changedIds]),
    };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'ok' in error && 'code' in error) throw error;
    throw {
      ok: false,
      command: 'canvas.patch',
      code: 'CANVAS_PATCH_FAILED',
      message: error instanceof Error ? error.message : String(error),
      canvasId: input.canvasId,
      canvasNameQuery: input.canvasNameQuery,
    } satisfies TCanvasCmdErrorDetails;
  }
}
