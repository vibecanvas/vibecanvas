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

function normalizeCanvas(row: TCanvasRecord): TCanvasSummary {
  return {
    id: row.id,
    name: row.name,
    automergeUrl: row.automerge_url,
    createdAt: toIsoString(row.created_at),
  };
}

function sortIds(values: readonly string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function throwCanvasError(details: TCanvasCmdErrorDetails): never {
  throw details;
}

function resolveCanvasSelection(rows: TCanvasRecord[], input: { canvasId: string | null; canvasNameQuery: string | null }): TCanvasRecord {
  if (input.canvasId && input.canvasNameQuery) {
    throwCanvasError({
      ok: false,
      command: 'canvas.patch',
      code: 'CANVAS_SELECTOR_CONFLICT',
      message: 'Pass exactly one canvas selector: use either canvasId or canvasNameQuery.',
      canvasId: input.canvasId,
      canvasNameQuery: input.canvasNameQuery,
    });
  }

  if (!input.canvasId && !input.canvasNameQuery) {
    throwCanvasError({
      ok: false,
      command: 'canvas.patch',
      code: 'CANVAS_SELECTOR_REQUIRED',
      message: 'Patch requires one canvas selector. Pass canvasId or canvasNameQuery.',
      canvasId: null,
      canvasNameQuery: null,
    });
  }

  if (input.canvasId) {
    const match = rows.find((row) => row.id === input.canvasId);
    if (match) return match;
    throwCanvasError({
      ok: false,
      command: 'canvas.patch',
      code: 'CANVAS_SELECTOR_NOT_FOUND',
      message: `Canvas '${input.canvasId}' was not found.`,
      canvasId: input.canvasId,
      canvasNameQuery: null,
    });
  }

  const query = input.canvasNameQuery?.trim() ?? '';
  const matches = rows.filter((row) => row.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));

  if (matches.length === 1) return matches[0]!;
  if (matches.length === 0) {
    throwCanvasError({
      ok: false,
      command: 'canvas.patch',
      code: 'CANVAS_SELECTOR_NOT_FOUND',
      message: `Canvas name query '${query}' did not match any canvas.`,
      canvasId: null,
      canvasNameQuery: query,
    });
  }

  throwCanvasError({
    ok: false,
    command: 'canvas.patch',
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validatePatchEnvelope(patch: TCanvasPatchEnvelope): void {
  if (!isPlainObject(patch)) {
    throwCanvasError({
      ok: false,
      command: 'canvas.patch',
      code: 'CANVAS_PATCH_PAYLOAD_INVALID',
      message: 'Patch payload must be an object.',
    });
  }

  const keys = Object.keys(patch);
  for (const key of keys) {
    if (key !== 'element' && key !== 'group') {
      throwCanvasError({
        ok: false,
        command: 'canvas.patch',
        code: 'CANVAS_PATCH_PAYLOAD_INVALID',
        message: `Unknown patch branch '${key}'.`,
      });
    }
  }

  if (!patch.element && !patch.group) {
    throwCanvasError({
      ok: false,
      command: 'canvas.patch',
      code: 'CANVAS_PATCH_PAYLOAD_INVALID',
      message: 'Patch payload must include element or group.',
    });
  }

  if (patch.element !== undefined) {
    if (!isPlainObject(patch.element)) {
      throwCanvasError({
        ok: false,
        command: 'canvas.patch',
        code: 'CANVAS_PATCH_PAYLOAD_INVALID',
        message: "Patch payload field 'element' must be an object.",
      });
    }

    for (const key of Object.keys(patch.element)) {
      if (!['x', 'y', 'rotation', 'zIndex', 'parentGroupId', 'locked', 'data', 'style'].includes(key)) {
        throwCanvasError({
          ok: false,
          command: 'canvas.patch',
          code: 'CANVAS_PATCH_PAYLOAD_INVALID',
          message: `Unknown patch field 'element.${key}'.`,
        });
      }
    }

    if (patch.element.data !== undefined && !isPlainObject(patch.element.data)) {
      throwCanvasError({
        ok: false,
        command: 'canvas.patch',
        code: 'CANVAS_PATCH_PAYLOAD_INVALID',
        message: "Patch payload field 'element.data' must be an object.",
      });
    }

    if (patch.element.style !== undefined && !isPlainObject(patch.element.style)) {
      throwCanvasError({
        ok: false,
        command: 'canvas.patch',
        code: 'CANVAS_PATCH_PAYLOAD_INVALID',
        message: "Patch payload field 'element.style' must be an object.",
      });
    }
  }

  if (patch.group !== undefined) {
    if (!isPlainObject(patch.group)) {
      throwCanvasError({
        ok: false,
        command: 'canvas.patch',
        code: 'CANVAS_PATCH_PAYLOAD_INVALID',
        message: "Patch payload field 'group' must be an object.",
      });
    }

    for (const key of Object.keys(patch.group)) {
      if (!['parentGroupId', 'zIndex', 'locked'].includes(key)) {
        throwCanvasError({
          ok: false,
          command: 'canvas.patch',
          code: 'CANVAS_PATCH_PAYLOAD_INVALID',
          message: `Unknown patch field 'group.${key}'.`,
        });
      }
    }
  }
}

function assertIds(input: TCanvasPatchInput): string[] {
  const ids = sortIds(input.ids.filter(Boolean));
  if (ids.length === 0) {
    throwCanvasError({
      ok: false,
      command: 'canvas.patch',
      code: 'CANVAS_PATCH_IDS_REQUIRED',
      message: 'Patch requires at least one id.',
      canvasId: input.canvasId,
      canvasNameQuery: input.canvasNameQuery,
    });
  }
  return ids;
}

function getAllowedDataKeys(element: TElement): Set<string> {
  return new Set(Object.keys(element.data));
}

function validateElementPatchForTarget(element: TElement, patch: TCanvasElementPatch): void {
  if (patch.data) {
    const allowedKeys = getAllowedDataKeys(element);
    for (const key of Object.keys(patch.data)) {
      if (!allowedKeys.has(key)) {
        throwCanvasError({
          ok: false,
          command: 'canvas.patch',
          code: 'CANVAS_PATCH_PAYLOAD_INVALID',
          message: `Patch field 'element.data.${key}' is invalid for element '${element.id}' of type '${element.data.type}'.`,
        });
      }
    }

    if ('type' in patch.data && patch.data.type !== element.data.type) {
      throwCanvasError({
        ok: false,
        command: 'canvas.patch',
        code: 'CANVAS_PATCH_PAYLOAD_INVALID',
        message: `Patch field 'element.data.type' cannot change element '${element.id}' type '${element.data.type}'.`,
      });
    }
  }
}

function assertParentGroupExists(doc: TCanvasDoc, parentGroupId: string | null | undefined, id: string, branch: 'element' | 'group'): void {
  if (parentGroupId === undefined || parentGroupId === null) return;
  if (doc.groups[parentGroupId]) return;
  throwCanvasError({
    ok: false,
    command: 'canvas.patch',
    code: 'CANVAS_PATCH_PARENT_GROUP_NOT_FOUND',
    message: `Patch sets missing parent group '${parentGroupId}' on ${branch} '${id}'.`,
  });
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
    if (value === undefined) return;
    if (next[key] === value) return;
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

export async function fxExecuteCanvasPatch(
  portal: TPortal,
  input: TCanvasPatchInput,
): Promise<TCanvasPatchSuccess> {
  try {
    validatePatchEnvelope(input.patch);
    const ids = assertIds(input);
    const selectedCanvas = resolveCanvasSelection(portal.dbService.canvas.listAll(), input);
    const handle = await portal.automergeService.repo.find<TCanvasDoc>(selectedCanvas.automerge_url as never);
    await handle.whenReady();

    const current = handle.doc();
    if (!current) throw new Error(`Canvas doc '${selectedCanvas.automerge_url}' is unavailable.`);

    const doc = structuredClone(current);
    const matchedIds = ids.filter((id) => doc.elements[id] || doc.groups[id]);

    if (matchedIds.length !== ids.length) {
      const missingId = ids.find((id) => !doc.elements[id] && !doc.groups[id])!;
      throwCanvasError({
        ok: false,
        command: 'canvas.patch',
        code: 'CANVAS_PATCH_TARGET_NOT_FOUND',
        message: `Target '${missingId}' was not found in canvas '${selectedCanvas.name}'.`,
        canvasId: selectedCanvas.id,
        canvasNameQuery: input.canvasNameQuery,
      });
    }

    for (const id of matchedIds) {
      const element = doc.elements[id];
      const group = doc.groups[id];

      if (element && input.patch.group) {
        throwCanvasError({
          ok: false,
          command: 'canvas.patch',
          code: 'CANVAS_PATCH_PAYLOAD_INVALID',
          message: `Patch branch 'group' cannot target element '${id}'.`,
        });
      }

      if (group && input.patch.element) {
        throwCanvasError({
          ok: false,
          command: 'canvas.patch',
          code: 'CANVAS_PATCH_PAYLOAD_INVALID',
          message: `Patch branch 'element' cannot target group '${id}'.`,
        });
      }

      if (element && input.patch.element) {
        validateElementPatchForTarget(element, input.patch.element);
        assertParentGroupExists(doc, input.patch.element.parentGroupId, id, 'element');
      }

      if (group && input.patch.group) {
        assertParentGroupExists(doc, input.patch.group.parentGroupId, id, 'group');
        if (input.patch.group.parentGroupId !== undefined && wouldCreateGroupCycle(doc, id, input.patch.group.parentGroupId)) {
          throwCanvasError({
            ok: false,
            command: 'canvas.patch',
            code: 'CANVAS_PATCH_GROUP_CYCLE',
            message: `Patch would create a group cycle for group '${id}'.`,
          });
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
      canvas: normalizeCanvas(selectedCanvas),
      matchedCount: matchedIds.length,
      matchedIds,
      changedCount: changedIds.size,
      changedIds: sortIds([...changedIds]),
    };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'ok' in error && 'code' in error) {
      throw error;
    }

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
