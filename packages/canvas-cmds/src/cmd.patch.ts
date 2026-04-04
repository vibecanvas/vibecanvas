import type { TCanvasDoc, TElement, TGroup } from '@vibecanvas/shell/automerge/index';
import type { TCanvasCmdContext, TCanvasRow } from './context';
import { normalizeCanvas } from './context';
import { toCanvasCmdError, throwCanvasCmdError, type TCanvasCmdErrorDetails } from './errors';
import { isGroupInSubtree, resolveCanvasSelection, sortIds, type TSceneTarget } from './scene-shared';

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
  patch: unknown;
};

export type TCanvasPatchSuccess = {
  ok: true;
  command: 'canvas.patch';
  patch: TCanvasPatchEnvelope;
  canvas: ReturnType<typeof normalizeCanvas>;
  matchedCount: number;
  matchedIds: string[];
  changedCount: number;
  changedIds: string[];
};

const ELEMENT_PATCH_KEYS = new Set(['x', 'y', 'rotation', 'zIndex', 'parentGroupId', 'locked', 'data', 'style']);
const GROUP_PATCH_KEYS = new Set(['parentGroupId', 'zIndex', 'locked']);
const STYLE_PATCH_VALIDATORS: Record<string, (value: unknown) => boolean> = {
  backgroundColor: (value) => typeof value === 'string',
  strokeColor: (value) => typeof value === 'string',
  strokeWidth: (value) => Number.isFinite(value),
  opacity: (value) => Number.isFinite(value),
  cornerRadius: (value) => Number.isFinite(value),
  borderColor: (value) => typeof value === 'string',
  headerColor: (value) => typeof value === 'string',
};
const ELEMENT_DATA_PATCH_VALIDATORS: Record<string, Record<string, (value: unknown) => boolean>> = {
  rect: {
    w: (value) => Number.isFinite(value),
    h: (value) => Number.isFinite(value),
    radius: (value) => Number.isFinite(value),
  },
  ellipse: {
    rx: (value) => Number.isFinite(value),
    ry: (value) => Number.isFinite(value),
  },
  diamond: {
    w: (value) => Number.isFinite(value),
    h: (value) => Number.isFinite(value),
    radius: (value) => Number.isFinite(value),
  },
  line: {
    lineType: (value) => value === 'straight' || value === 'curved',
    points: (value) => isPointList(value),
    startBinding: (value) => isBindingOrNull(value),
    endBinding: (value) => isBindingOrNull(value),
  },
  arrow: {
    lineType: (value) => value === 'straight' || value === 'curved',
    points: (value) => isPointList(value),
    startBinding: (value) => isBindingOrNull(value),
    endBinding: (value) => isBindingOrNull(value),
    startCap: (value) => value === 'none' || value === 'arrow' || value === 'dot' || value === 'diamond',
    endCap: (value) => value === 'none' || value === 'arrow' || value === 'dot' || value === 'diamond',
  },
  pen: {
    points: (value) => isPointList(value),
    pressures: (value) => Array.isArray(value) && value.every((entry) => Number.isFinite(entry)),
    simulatePressure: (value) => typeof value === 'boolean',
  },
  text: {
    w: (value) => Number.isFinite(value),
    h: (value) => Number.isFinite(value),
    text: (value) => typeof value === 'string',
    originalText: (value) => typeof value === 'string',
    fontSize: (value) => Number.isFinite(value),
    fontFamily: (value) => typeof value === 'string',
    textAlign: (value) => value === 'left' || value === 'center' || value === 'right',
    verticalAlign: (value) => value === 'top' || value === 'middle' || value === 'bottom',
    lineHeight: (value) => Number.isFinite(value),
    link: (value) => typeof value === 'string' || value === null,
    containerId: (value) => typeof value === 'string' || value === null,
    autoResize: (value) => typeof value === 'boolean',
  },
  image: {
    url: (value) => typeof value === 'string' || value === null,
    base64: (value) => typeof value === 'string' || value === null,
    w: (value) => Number.isFinite(value),
    h: (value) => Number.isFinite(value),
    crop: (value) => isImageCrop(value),
  },
  filetree: {
    w: (value) => Number.isFinite(value),
    h: (value) => Number.isFinite(value),
    isCollapsed: (value) => typeof value === 'boolean',
    globPattern: (value) => typeof value === 'string' || value === null,
  },
  terminal: {
    w: (value) => Number.isFinite(value),
    h: (value) => Number.isFinite(value),
    isCollapsed: (value) => typeof value === 'boolean',
    workingDirectory: (value) => typeof value === 'string',
  },
  file: {
    w: (value) => Number.isFinite(value),
    h: (value) => Number.isFinite(value),
    isCollapsed: (value) => typeof value === 'boolean',
    path: (value) => typeof value === 'string',
    renderer: (value) => value === 'pdf' || value === 'image' || value === 'text' || value === 'code' || value === 'markdown' || value === 'audio' || value === 'video' || value === 'unknown',
  },
  'iframe-browser': {
    w: (value) => Number.isFinite(value),
    h: (value) => Number.isFinite(value),
    isCollapsed: (value) => typeof value === 'boolean',
    tabs: (value) => isIframeBrowserTabs(value),
    activeTabId: (value) => typeof value === 'string',
  },
};

function exitPatchError(error: TCanvasCmdErrorDetails): never {
  throwCanvasCmdError(error);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPoint2D(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && Number.isFinite(value[0]) && Number.isFinite(value[1]);
}

function isPointList(value: unknown): boolean {
  return Array.isArray(value) && value.every((entry) => isPoint2D(entry));
}

function isBinding(value: unknown): boolean {
  return isPlainObject(value)
    && typeof value.targetId === 'string'
    && isPlainObject(value.anchor)
    && Number.isFinite(value.anchor.x)
    && Number.isFinite(value.anchor.y);
}

function isBindingOrNull(value: unknown): boolean {
  return value === null || isBinding(value);
}

function isImageCrop(value: unknown): boolean {
  return isPlainObject(value)
    && Number.isFinite(value.x)
    && Number.isFinite(value.y)
    && Number.isFinite(value.width)
    && Number.isFinite(value.height)
    && Number.isFinite(value.naturalWidth)
    && Number.isFinite(value.naturalHeight);
}

function isIframeBrowserTabs(value: unknown): boolean {
  return Array.isArray(value)
    && value.every((entry) => isPlainObject(entry) && typeof entry.id === 'string' && typeof entry.url === 'string' && typeof entry.title === 'string');
}

function hasPatchLeafValue(value: unknown): boolean {
  if (Array.isArray(value)) return true;
  if (!isPlainObject(value)) return value !== undefined;
  const entries = Object.values(value);
  if (entries.length === 0) return false;
  return entries.some((entry) => hasPatchLeafValue(entry));
}

function ensureFiniteNumber(args: {
  value: unknown;
  label: string;
  command: 'canvas.patch';
  canvasId: string | null;
  canvasNameQuery: string | null;
}): number {
  if (Number.isFinite(args.value)) return Number(args.value);
  exitPatchError({
    ok: false,
    command: args.command,
    code: 'CANVAS_PATCH_PAYLOAD_INVALID',
    message: `Patch field '${args.label}' must be a finite number.`,
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
  });
}

function ensureString(args: {
  value: unknown;
  label: string;
  command: 'canvas.patch';
  canvasId: string | null;
  canvasNameQuery: string | null;
}): string {
  if (typeof args.value === 'string') return args.value;
  exitPatchError({
    ok: false,
    command: args.command,
    code: 'CANVAS_PATCH_PAYLOAD_INVALID',
    message: `Patch field '${args.label}' must be a string.`,
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
  });
}

function ensureStringOrNull(args: {
  value: unknown;
  label: string;
  command: 'canvas.patch';
  canvasId: string | null;
  canvasNameQuery: string | null;
}): string | null {
  if (typeof args.value === 'string' || args.value === null) return args.value;
  exitPatchError({
    ok: false,
    command: args.command,
    code: 'CANVAS_PATCH_PAYLOAD_INVALID',
    message: `Patch field '${args.label}' must be a string or null.`,
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
  });
}

function ensureBoolean(args: {
  value: unknown;
  label: string;
  command: 'canvas.patch';
  canvasId: string | null;
  canvasNameQuery: string | null;
}): boolean {
  if (typeof args.value === 'boolean') return args.value;
  exitPatchError({
    ok: false,
    command: args.command,
    code: 'CANVAS_PATCH_PAYLOAD_INVALID',
    message: `Patch field '${args.label}' must be a boolean.`,
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
  });
}

function ensureObjectKeys(args: {
  object: Record<string, unknown>;
  allowedKeys: Set<string>;
  label: string;
  canvasId: string | null;
  canvasNameQuery: string | null;
}): void {
  for (const key of Object.keys(args.object)) {
    if (args.allowedKeys.has(key)) continue;
    exitPatchError({
      ok: false,
      command: 'canvas.patch',
      code: 'CANVAS_PATCH_PAYLOAD_INVALID',
      message: `Patch field '${args.label}.${key}' is not allowed.`,
      canvasId: args.canvasId,
      canvasNameQuery: args.canvasNameQuery,
    });
  }
}

function normalizePatchIds(args: {
  ids: string[];
  canvasId: string | null;
  canvasNameQuery: string | null;
}): string[] {
  const normalized = sortIds([...new Set(args.ids.map((value) => value.trim()).filter(Boolean))]);
  if (normalized.length > 0) return normalized;
  exitPatchError({
    ok: false,
    command: 'canvas.patch',
    code: 'CANVAS_PATCH_ID_REQUIRED',
    message: 'Patch requires at least one --id <id> target.',
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
  });
}

function normalizeElementPatch(args: {
  value: unknown;
  canvasId: string | null;
  canvasNameQuery: string | null;
}): TCanvasElementPatch {
  if (!isPlainObject(args.value)) {
    exitPatchError({
      ok: false,
      command: 'canvas.patch',
      code: 'CANVAS_PATCH_PAYLOAD_INVALID',
      message: "Patch branch 'element' must be an object.",
      canvasId: args.canvasId,
      canvasNameQuery: args.canvasNameQuery,
    });
  }

  ensureObjectKeys({ object: args.value, allowedKeys: ELEMENT_PATCH_KEYS, label: 'element', canvasId: args.canvasId, canvasNameQuery: args.canvasNameQuery });
  const patch: TCanvasElementPatch = {};

  if (Object.prototype.hasOwnProperty.call(args.value, 'x')) patch.x = ensureFiniteNumber({ value: args.value.x, label: 'element.x', command: 'canvas.patch', canvasId: args.canvasId, canvasNameQuery: args.canvasNameQuery });
  if (Object.prototype.hasOwnProperty.call(args.value, 'y')) patch.y = ensureFiniteNumber({ value: args.value.y, label: 'element.y', command: 'canvas.patch', canvasId: args.canvasId, canvasNameQuery: args.canvasNameQuery });
  if (Object.prototype.hasOwnProperty.call(args.value, 'rotation')) patch.rotation = ensureFiniteNumber({ value: args.value.rotation, label: 'element.rotation', command: 'canvas.patch', canvasId: args.canvasId, canvasNameQuery: args.canvasNameQuery });
  if (Object.prototype.hasOwnProperty.call(args.value, 'zIndex')) patch.zIndex = ensureString({ value: args.value.zIndex, label: 'element.zIndex', command: 'canvas.patch', canvasId: args.canvasId, canvasNameQuery: args.canvasNameQuery });
  if (Object.prototype.hasOwnProperty.call(args.value, 'parentGroupId')) patch.parentGroupId = ensureStringOrNull({ value: args.value.parentGroupId, label: 'element.parentGroupId', command: 'canvas.patch', canvasId: args.canvasId, canvasNameQuery: args.canvasNameQuery });
  if (Object.prototype.hasOwnProperty.call(args.value, 'locked')) patch.locked = ensureBoolean({ value: args.value.locked, label: 'element.locked', command: 'canvas.patch', canvasId: args.canvasId, canvasNameQuery: args.canvasNameQuery });

  if (Object.prototype.hasOwnProperty.call(args.value, 'data')) {
    if (!isPlainObject(args.value.data)) {
      exitPatchError({
        ok: false,
        command: 'canvas.patch',
        code: 'CANVAS_PATCH_PAYLOAD_INVALID',
        message: "Patch branch 'element.data' must be an object.",
        canvasId: args.canvasId,
        canvasNameQuery: args.canvasNameQuery,
      });
    }
    patch.data = structuredClone(args.value.data);
  }

  if (Object.prototype.hasOwnProperty.call(args.value, 'style')) {
    if (!isPlainObject(args.value.style)) {
      exitPatchError({
        ok: false,
        command: 'canvas.patch',
        code: 'CANVAS_PATCH_PAYLOAD_INVALID',
        message: "Patch branch 'element.style' must be an object.",
        canvasId: args.canvasId,
        canvasNameQuery: args.canvasNameQuery,
      });
    }

    for (const [key, value] of Object.entries(args.value.style)) {
      const validator = STYLE_PATCH_VALIDATORS[key];
      if (!validator) {
        exitPatchError({
          ok: false,
          command: 'canvas.patch',
          code: 'CANVAS_PATCH_PAYLOAD_INVALID',
          message: `Patch field 'element.style.${key}' is not allowed.`,
          canvasId: args.canvasId,
          canvasNameQuery: args.canvasNameQuery,
        });
      }

      if (!validator(value)) {
        exitPatchError({
          ok: false,
          command: 'canvas.patch',
          code: 'CANVAS_PATCH_PAYLOAD_INVALID',
          message: `Patch field 'element.style.${key}' has an invalid value.`,
          canvasId: args.canvasId,
          canvasNameQuery: args.canvasNameQuery,
        });
      }
    }

    patch.style = structuredClone(args.value.style);
  }

  return patch;
}

function normalizeGroupPatch(args: {
  value: unknown;
  canvasId: string | null;
  canvasNameQuery: string | null;
}): TCanvasGroupPatch {
  if (!isPlainObject(args.value)) {
    exitPatchError({
      ok: false,
      command: 'canvas.patch',
      code: 'CANVAS_PATCH_PAYLOAD_INVALID',
      message: "Patch branch 'group' must be an object.",
      canvasId: args.canvasId,
      canvasNameQuery: args.canvasNameQuery,
    });
  }

  ensureObjectKeys({ object: args.value, allowedKeys: GROUP_PATCH_KEYS, label: 'group', canvasId: args.canvasId, canvasNameQuery: args.canvasNameQuery });
  const patch: TCanvasGroupPatch = {};

  if (Object.prototype.hasOwnProperty.call(args.value, 'parentGroupId')) patch.parentGroupId = ensureStringOrNull({ value: args.value.parentGroupId, label: 'group.parentGroupId', command: 'canvas.patch', canvasId: args.canvasId, canvasNameQuery: args.canvasNameQuery });
  if (Object.prototype.hasOwnProperty.call(args.value, 'zIndex')) patch.zIndex = ensureString({ value: args.value.zIndex, label: 'group.zIndex', command: 'canvas.patch', canvasId: args.canvasId, canvasNameQuery: args.canvasNameQuery });
  if (Object.prototype.hasOwnProperty.call(args.value, 'locked')) patch.locked = ensureBoolean({ value: args.value.locked, label: 'group.locked', command: 'canvas.patch', canvasId: args.canvasId, canvasNameQuery: args.canvasNameQuery });

  return patch;
}

function normalizePatchEnvelope(args: {
  patch: unknown;
  canvasId: string | null;
  canvasNameQuery: string | null;
}): TCanvasPatchEnvelope {
  if (!isPlainObject(args.patch)) {
    exitPatchError({
      ok: false,
      command: 'canvas.patch',
      code: 'CANVAS_PATCH_PAYLOAD_REQUIRED',
      message: 'Patch requires one JSON object payload with an element and/or group branch.',
      canvasId: args.canvasId,
      canvasNameQuery: args.canvasNameQuery,
    });
  }

  ensureObjectKeys({ object: args.patch, allowedKeys: new Set(['element', 'group']), label: 'patch', canvasId: args.canvasId, canvasNameQuery: args.canvasNameQuery });
  const patch: TCanvasPatchEnvelope = {};

  if (Object.prototype.hasOwnProperty.call(args.patch, 'element')) patch.element = normalizeElementPatch({ value: args.patch.element, canvasId: args.canvasId, canvasNameQuery: args.canvasNameQuery });
  if (Object.prototype.hasOwnProperty.call(args.patch, 'group')) patch.group = normalizeGroupPatch({ value: args.patch.group, canvasId: args.canvasId, canvasNameQuery: args.canvasNameQuery });

  if (hasPatchLeafValue(patch)) return patch;

  exitPatchError({
    ok: false,
    command: 'canvas.patch',
    code: 'CANVAS_PATCH_PAYLOAD_REQUIRED',
    message: 'Patch payload must include at least one field update.',
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

  exitPatchError({
    ok: false,
    command: 'canvas.patch',
    code: 'CANVAS_PATCH_TARGET_NOT_FOUND',
    message: `Target ids were not found in canvas '${args.doc.name}': ${sortIds(missingIds).join(', ')}.`,
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
  });
}

function validatePatchTargets(args: {
  doc: TCanvasDoc;
  matchedTargets: readonly TSceneTarget[];
  patch: TCanvasPatchEnvelope;
  canvasId: string;
  canvasNameQuery: string | null;
}): void {
  const matchedElements = args.matchedTargets.filter((target): target is Extract<TSceneTarget, { kind: 'element' }> => target.kind === 'element');
  const matchedGroups = args.matchedTargets.filter((target): target is Extract<TSceneTarget, { kind: 'group' }> => target.kind === 'group');

  if (matchedElements.length > 0 && !args.patch.element) {
    exitPatchError({
      ok: false,
      command: 'canvas.patch',
      code: 'CANVAS_PATCH_PAYLOAD_INVALID',
      message: 'Matched ids include elements, but the patch payload does not include an element branch.',
      canvasId: args.canvasId,
      canvasNameQuery: args.canvasNameQuery,
    });
  }

  if (matchedGroups.length > 0 && !args.patch.group) {
    exitPatchError({
      ok: false,
      command: 'canvas.patch',
      code: 'CANVAS_PATCH_PAYLOAD_INVALID',
      message: 'Matched ids include groups, but the patch payload does not include a group branch.',
      canvasId: args.canvasId,
      canvasNameQuery: args.canvasNameQuery,
    });
  }

  if (matchedElements.length === 0 && args.patch.element) {
    exitPatchError({
      ok: false,
      command: 'canvas.patch',
      code: 'CANVAS_PATCH_PAYLOAD_INVALID',
      message: 'Patch payload includes an element branch, but no matched ids resolve to elements.',
      canvasId: args.canvasId,
      canvasNameQuery: args.canvasNameQuery,
    });
  }

  if (matchedGroups.length === 0 && args.patch.group) {
    exitPatchError({
      ok: false,
      command: 'canvas.patch',
      code: 'CANVAS_PATCH_PAYLOAD_INVALID',
      message: 'Patch payload includes a group branch, but no matched ids resolve to groups.',
      canvasId: args.canvasId,
      canvasNameQuery: args.canvasNameQuery,
    });
  }

  const parentGroupId = args.patch.element?.parentGroupId;
  if (parentGroupId !== undefined && parentGroupId !== null && !args.doc.groups[parentGroupId]) {
    exitPatchError({
      ok: false,
      command: 'canvas.patch',
      code: 'CANVAS_PATCH_PAYLOAD_INVALID',
      message: `Patch field 'element.parentGroupId' references missing group '${parentGroupId}'.`,
      canvasId: args.canvasId,
      canvasNameQuery: args.canvasNameQuery,
    });
  }

  const groupParentId = args.patch.group?.parentGroupId;
  if (groupParentId !== undefined && groupParentId !== null && !args.doc.groups[groupParentId]) {
    exitPatchError({
      ok: false,
      command: 'canvas.patch',
      code: 'CANVAS_PATCH_PAYLOAD_INVALID',
      message: `Patch field 'group.parentGroupId' references missing group '${groupParentId}'.`,
      canvasId: args.canvasId,
      canvasNameQuery: args.canvasNameQuery,
    });
  }

  if (groupParentId !== undefined && groupParentId !== null) {
    for (const target of matchedGroups) {
      if (!isGroupInSubtree(args.doc, groupParentId, target.group.id)) continue;
      exitPatchError({
        ok: false,
        command: 'canvas.patch',
        code: 'CANVAS_PATCH_PAYLOAD_INVALID',
        message: `Group '${target.group.id}' cannot be reparented into its own subtree '${groupParentId}'.`,
        canvasId: args.canvasId,
        canvasNameQuery: args.canvasNameQuery,
      });
    }
  }

  if (!args.patch.element?.data) return;

  for (const target of matchedElements) {
    const validators = ELEMENT_DATA_PATCH_VALIDATORS[target.element.data.type];
    for (const [key, value] of Object.entries(args.patch.element.data)) {
      const validator = validators[key];
      if (!validator) {
        exitPatchError({
          ok: false,
          command: 'canvas.patch',
          code: 'CANVAS_PATCH_PAYLOAD_INVALID',
          message: `Patch field 'element.data.${key}' is invalid for element '${target.element.id}' of type '${target.element.data.type}'.`,
          canvasId: args.canvasId,
          canvasNameQuery: args.canvasNameQuery,
        });
      }

      if (!validator(value)) {
        exitPatchError({
          ok: false,
          command: 'canvas.patch',
          code: 'CANVAS_PATCH_PAYLOAD_INVALID',
          message: `Patch field 'element.data.${key}' has an invalid value for element '${target.element.id}' of type '${target.element.data.type}'.`,
          canvasId: args.canvasId,
          canvasNameQuery: args.canvasNameQuery,
        });
      }
    }
  }
}

function areValuesEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (left === null || right === null) return left === right;
  if (typeof left !== typeof right) return false;

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;
    for (let index = 0; index < left.length; index += 1) {
      if (!areValuesEqual(left[index], right[index])) return false;
    }
    return true;
  }

  if (typeof left === 'object' && typeof right === 'object') {
    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    const leftKeys = Object.keys(leftRecord).sort();
    const rightKeys = Object.keys(rightRecord).sort();
    if (leftKeys.length !== rightKeys.length) return false;
    for (let index = 0; index < leftKeys.length; index += 1) {
      if (leftKeys[index] !== rightKeys[index]) return false;
    }
    for (const key of leftKeys) {
      if (!areValuesEqual(leftRecord[key], rightRecord[key])) return false;
    }
    return true;
  }

  return false;
}

function buildPatchedElement(element: TElement, patch: TCanvasElementPatch, now: number): TElement {
  const next = structuredClone(element);
  if (patch.x !== undefined) next.x = patch.x;
  if (patch.y !== undefined) next.y = patch.y;
  if (patch.rotation !== undefined) next.rotation = patch.rotation;
  if (patch.zIndex !== undefined) next.zIndex = patch.zIndex;
  if (patch.parentGroupId !== undefined) next.parentGroupId = patch.parentGroupId;
  if (patch.locked !== undefined) next.locked = patch.locked;
  if (patch.data) Object.assign(next.data as Record<string, unknown>, structuredClone(patch.data));
  if (patch.style) Object.assign(next.style, structuredClone(patch.style));
  if (!areValuesEqual(element, next)) next.updatedAt = now;
  return next;
}

function buildPatchedGroup(group: TGroup, patch: TCanvasGroupPatch): TGroup {
  const next = structuredClone(group);
  if (patch.parentGroupId !== undefined) next.parentGroupId = patch.parentGroupId;
  if (patch.zIndex !== undefined) next.zIndex = patch.zIndex;
  if (patch.locked !== undefined) next.locked = patch.locked;
  return next;
}

export async function executeCanvasPatch(ctx: TCanvasCmdContext, input: TCanvasPatchInput): Promise<TCanvasPatchSuccess> {
  const canvasId = input.canvasId;
  const canvasNameQuery = input.canvasNameQuery;
  const ids = normalizePatchIds({ ids: input.ids, canvasId, canvasNameQuery });
  const patch = normalizePatchEnvelope({ patch: input.patch, canvasId, canvasNameQuery });

  try {
    const rows = await ctx.listCanvasRows() as TCanvasRow[];
    const selectedCanvas = resolveCanvasSelection({
      rows,
      selector: { canvasId, canvasNameQuery },
      command: 'canvas.patch',
      actionLabel: 'Patch',
      fail: (error) => exitPatchError(error),
    });
    const resolvedHandle = await ctx.loadCanvasHandle(selectedCanvas);
    const currentDoc = resolvedHandle.handle.doc();
    if (!currentDoc) {
      throw new Error(`Canvas doc '${selectedCanvas.automerge_url}' is unavailable.`);
    }

    const doc = structuredClone(currentDoc);
    const matchedTargets = resolveTargetsByIds({ doc, ids, canvasId: selectedCanvas.id, canvasNameQuery });
    validatePatchTargets({ doc, matchedTargets, patch, canvasId: selectedCanvas.id, canvasNameQuery });

    const expectedElements = new Map<string, TElement>();
    const expectedGroups = new Map<string, TGroup>();
    const changedIds: string[] = [];
    const now = Date.now();

    for (const target of matchedTargets) {
      if (target.kind === 'element') {
        const next = buildPatchedElement(target.element, patch.element!, now);
        if (areValuesEqual(target.element, next)) continue;
        expectedElements.set(target.element.id, next);
        changedIds.push(target.element.id);
        continue;
      }

      const next = buildPatchedGroup(target.group, patch.group!);
      if (areValuesEqual(target.group, next)) continue;
      expectedGroups.set(target.group.id, next);
      changedIds.push(target.group.id);
    }

    const sortedChangedIds = sortIds(changedIds);
    const handle = resolvedHandle.handle;

    if (sortedChangedIds.length > 0) {
      handle.change((nextDoc) => {
        for (const [id, element] of expectedElements) {
          nextDoc.elements[id] = structuredClone(element);
        }

        for (const [id, group] of expectedGroups) {
          nextDoc.groups[id] = structuredClone(group);
        }
      });

      await ctx.waitForMutation({
        source: resolvedHandle.source,
        handle,
        automergeUrl: selectedCanvas.automerge_url,
        predicate: (persistedDoc) => {
          for (const [id, element] of expectedElements) {
            if (!areValuesEqual(persistedDoc.elements[id], element)) return false;
          }

          for (const [id, group] of expectedGroups) {
            if (!areValuesEqual(persistedDoc.groups[id], group)) return false;
          }

          return true;
        },
      });
    }

    return {
      ok: true,
      command: 'canvas.patch',
      patch,
      canvas: normalizeCanvas(selectedCanvas),
      matchedCount: ids.length,
      matchedIds: ids,
      changedCount: sortedChangedIds.length,
      changedIds: sortedChangedIds,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'CanvasCmdError') throw error;
    throw toCanvasCmdError({
      command: 'canvas.patch',
      code: 'CANVAS_PATCH_FAILED',
      message: error instanceof Error ? error.message : String(error),
      canvasId,
      canvasNameQuery,
    });
  }
}
