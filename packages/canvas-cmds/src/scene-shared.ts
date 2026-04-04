import type { TCanvasDoc, TElement, TElementType, TGroup } from '@vibecanvas/shell/automerge/index';
import type { TCanvasRow, TCanvasSelector, TCanvasSummary } from './context';
import type { TCanvasCmdErrorDetails } from './errors';

export const SCENE_OUTPUT_MODES = ['summary', 'focused', 'full'] as const;

export type TSceneOutputMode = (typeof SCENE_OUTPUT_MODES)[number];

export type TCanvasSelectionError = TCanvasCmdErrorDetails & {
  canvasId?: string | null;
  canvasNameQuery?: string | null;
  matches?: Array<{ id: string; name: string }>;
};

export type TSceneBounds = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type TSceneTarget =
  | { kind: 'element'; element: TElement }
  | { kind: 'group'; group: TGroup };

export type TSceneMatchMetadata = {
  kind: 'element' | 'group';
  id: string;
  type: TElementType | null;
  parentGroupId: string | null;
  zIndex: string;
  locked: boolean;
  bounds: TSceneBounds | null;
};

export function sortIds(values: readonly string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

export function buildGroupRelations(doc: TCanvasDoc, groupId: string): {
  directChildElementIds: string[];
  directChildGroupIds: string[];
  descendantElementCount: number;
  descendantGroupCount: number;
} {
  const directChildElementIds = sortIds(Object.values(doc.elements).filter((element) => element.parentGroupId === groupId).map((element) => element.id));
  const directChildGroupIds = sortIds(Object.values(doc.groups).filter((group) => group.parentGroupId === groupId).map((group) => group.id));
  const pending = [...directChildGroupIds];
  const visited = new Set<string>();
  let descendantElementCount = directChildElementIds.length;
  let descendantGroupCount = directChildGroupIds.length;

  while (pending.length > 0) {
    const currentGroupId = pending.shift();
    if (!currentGroupId || visited.has(currentGroupId)) continue;
    visited.add(currentGroupId);
    descendantElementCount += Object.values(doc.elements).filter((element) => element.parentGroupId === currentGroupId).length;
    for (const nestedGroupId of Object.values(doc.groups).filter((group) => group.parentGroupId === currentGroupId).map((group) => group.id)) {
      if (visited.has(nestedGroupId)) continue;
      descendantGroupCount += 1;
      pending.push(nestedGroupId);
    }
  }

  return {
    directChildElementIds,
    directChildGroupIds,
    descendantElementCount,
    descendantGroupCount,
  };
}

export function buildElementPayload(element: TElement, mode: TSceneOutputMode): Record<string, unknown> {
  const summary = {
    kind: 'element',
    id: element.id,
    type: element.data.type,
    parentGroupId: element.parentGroupId,
    zIndex: element.zIndex,
    locked: element.locked,
    position: { x: element.x, y: element.y },
    createdAt: element.createdAt,
    updatedAt: element.updatedAt,
  };

  if (mode === 'summary') return summary;
  if (mode === 'focused') return { ...summary, bindingCount: element.bindings.length, data: structuredClone(element.data), style: structuredClone(element.style) };
  return { kind: 'element', id: element.id, record: structuredClone(element) };
}

export function buildGroupPayload(group: TGroup, doc: TCanvasDoc, mode: TSceneOutputMode): Record<string, unknown> {
  const relations = buildGroupRelations(doc, group.id);
  const summary = {
    kind: 'group',
    id: group.id,
    parentGroupId: group.parentGroupId,
    zIndex: group.zIndex,
    locked: group.locked,
    createdAt: group.createdAt,
    directChildElementIds: relations.directChildElementIds,
    directChildGroupIds: relations.directChildGroupIds,
    directChildElementCount: relations.directChildElementIds.length,
    directChildGroupCount: relations.directChildGroupIds.length,
  };

  if (mode === 'summary') return summary;
  if (mode === 'focused') return { ...summary, ...relations };
  return { kind: 'group', id: group.id, record: structuredClone(group), ...relations };
}

export function buildTargetPayload(target: TSceneTarget, doc: TCanvasDoc, mode: TSceneOutputMode): Record<string, unknown> {
  return target.kind === 'element' ? buildElementPayload(target.element, mode) : buildGroupPayload(target.group, doc, mode);
}

function createBounds(x: number, y: number, w: number, h: number): TSceneBounds {
  return { x, y, w: Math.max(0, w), h: Math.max(0, h) };
}

function unionBounds(left: TSceneBounds | null, right: TSceneBounds | null): TSceneBounds | null {
  if (!left) return right ? { ...right } : null;
  if (!right) return { ...left };
  const minX = Math.min(left.x, right.x);
  const minY = Math.min(left.y, right.y);
  const maxX = Math.max(left.x + left.w, right.x + right.w);
  const maxY = Math.max(left.y + left.h, right.y + right.h);
  return createBounds(minX, minY, maxX - minX, maxY - minY);
}

function getStrokeWidth(element: TElement): number {
  return element.style.strokeWidth ?? 1;
}

function getPolylinePadding(element: TElement): number {
  const strokeWidth = getStrokeWidth(element);
  if (element.data.type === 'arrow') return Math.max(strokeWidth * 4.5, 18, strokeWidth * 1.5, 8);
  return Math.max(strokeWidth * 1.5, 8);
}

function getPointBounds(element: TElement, points: Array<[number, number]>): TSceneBounds {
  if (points.length === 0) {
    const strokeWidth = getStrokeWidth(element);
    return createBounds(element.x - strokeWidth, element.y - strokeWidth, strokeWidth * 2, strokeWidth * 2);
  }

  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const pad = getPolylinePadding(element);
  const minX = element.x + Math.min(...xs) - pad;
  const minY = element.y + Math.min(...ys) - pad;
  const maxX = element.x + Math.max(...xs) + pad;
  const maxY = element.y + Math.max(...ys) + pad;
  return createBounds(minX, minY, maxX - minX, maxY - minY);
}

export function getElementBounds(element: TElement): TSceneBounds {
  if (element.data.type === 'rect' || element.data.type === 'diamond' || element.data.type === 'text' || element.data.type === 'image' || element.data.type === 'filetree' || element.data.type === 'terminal' || element.data.type === 'file' || element.data.type === 'iframe-browser') {
    return createBounds(element.x, element.y, element.data.w, element.data.h);
  }

  if (element.data.type === 'ellipse') {
    return createBounds(element.x, element.y, element.data.rx * 2, element.data.ry * 2);
  }

  if (element.data.type === 'line' || element.data.type === 'arrow' || element.data.type === 'pen') {
    return getPointBounds(element, element.data.points);
  }

  return createBounds(element.x, element.y, 0, 0);
}

export function getGroupBounds(doc: TCanvasDoc, groupId: string): TSceneBounds | null {
  const pending = [groupId];
  const visited = new Set<string>();
  let bounds: TSceneBounds | null = null;

  while (pending.length > 0) {
    const currentGroupId = pending.shift();
    if (!currentGroupId || visited.has(currentGroupId)) continue;
    visited.add(currentGroupId);

    for (const element of Object.values(doc.elements)) {
      if (element.parentGroupId !== currentGroupId) continue;
      bounds = unionBounds(bounds, getElementBounds(element));
    }

    for (const group of Object.values(doc.groups)) {
      if (group.parentGroupId !== currentGroupId) continue;
      pending.push(group.id);
    }
  }

  return bounds;
}

export function getTargetBounds(doc: TCanvasDoc, target: TSceneTarget): TSceneBounds | null {
  return target.kind === 'element' ? getElementBounds(target.element) : getGroupBounds(doc, target.group.id);
}

export function buildMatchMetadata(target: TSceneTarget, doc: TCanvasDoc): TSceneMatchMetadata {
  if (target.kind === 'element') {
    return {
      kind: 'element',
      id: target.element.id,
      type: target.element.data.type,
      parentGroupId: target.element.parentGroupId,
      zIndex: target.element.zIndex,
      locked: target.element.locked,
      bounds: getElementBounds(target.element),
    };
  }

  return {
    kind: 'group',
    id: target.group.id,
    type: null,
    parentGroupId: target.group.parentGroupId,
    zIndex: target.group.zIndex,
    locked: target.group.locked,
    bounds: getGroupBounds(doc, target.group.id),
  };
}

export function getGroupAncestry(doc: TCanvasDoc, groupId: string | null): string[] {
  if (!groupId) return [];
  const ancestry: string[] = [];
  const visited = new Set<string>();
  let currentGroupId: string | null = groupId;

  while (currentGroupId) {
    if (visited.has(currentGroupId)) break;
    visited.add(currentGroupId);
    ancestry.unshift(currentGroupId);
    currentGroupId = doc.groups[currentGroupId]?.parentGroupId ?? null;
  }

  return ancestry;
}

export function isGroupInSubtree(doc: TCanvasDoc, candidateGroupId: string, rootGroupId: string): boolean {
  if (candidateGroupId === rootGroupId) return true;
  return getGroupAncestry(doc, candidateGroupId).includes(rootGroupId);
}

export function sortSceneTargets(doc: TCanvasDoc, targets: readonly TSceneTarget[]): TSceneTarget[] {
  return [...targets].sort((left, right) => {
    const leftParentGroupId = left.kind === 'element' ? left.element.parentGroupId : left.group.parentGroupId;
    const rightParentGroupId = right.kind === 'element' ? right.element.parentGroupId : right.group.parentGroupId;
    const leftAncestry = getGroupAncestry(doc, leftParentGroupId);
    const rightAncestry = getGroupAncestry(doc, rightParentGroupId);
    if (leftAncestry.length !== rightAncestry.length) return leftAncestry.length - rightAncestry.length;

    const leftPath = `${leftAncestry.join('/')}|${leftParentGroupId ?? '~root'}`;
    const rightPath = `${rightAncestry.join('/')}|${rightParentGroupId ?? '~root'}`;
    if (leftPath !== rightPath) return leftPath.localeCompare(rightPath);

    const leftZIndex = left.kind === 'element' ? left.element.zIndex : left.group.zIndex;
    const rightZIndex = right.kind === 'element' ? right.element.zIndex : right.group.zIndex;
    if (leftZIndex !== rightZIndex) return leftZIndex.localeCompare(rightZIndex);

    if (left.kind !== right.kind) return left.kind.localeCompare(right.kind);

    const leftId = left.kind === 'element' ? left.element.id : left.group.id;
    const rightId = right.kind === 'element' ? right.element.id : right.group.id;
    return leftId.localeCompare(rightId);
  });
}

export function resolveCanvasSelection(args: {
  rows: TCanvasRow[];
  selector: TCanvasSelector;
  command: string;
  actionLabel: string;
  fail: (error: TCanvasSelectionError) => never;
}): TCanvasRow {
  if (args.selector.canvasId && args.selector.canvasNameQuery) {
    args.fail({
      ok: false,
      command: args.command,
      code: 'CANVAS_SELECTOR_CONFLICT',
      message: 'Pass exactly one canvas selector: use either --canvas <id> or --canvas-name <query>.',
      canvasId: args.selector.canvasId,
      canvasNameQuery: args.selector.canvasNameQuery,
    });
  }

  if (!args.selector.canvasId && !args.selector.canvasNameQuery) {
    args.fail({
      ok: false,
      command: args.command,
      code: 'CANVAS_SELECTOR_REQUIRED',
      message: `${args.actionLabel} requires one canvas selector. Pass --canvas <id> or --canvas-name <query>.`,
      canvasId: null,
      canvasNameQuery: null,
    });
  }

  if (args.selector.canvasId) {
    const exact = args.rows.find((row) => row.id === args.selector.canvasId);
    if (exact) return exact;
    args.fail({
      ok: false,
      command: args.command,
      code: 'CANVAS_SELECTOR_NOT_FOUND',
      message: `Canvas '${args.selector.canvasId}' was not found.`,
      canvasId: args.selector.canvasId,
      canvasNameQuery: null,
    });
  }

  const query = args.selector.canvasNameQuery?.trim() ?? '';
  if (!query) {
    args.fail({
      ok: false,
      command: args.command,
      code: 'CANVAS_SELECTOR_REQUIRED',
      message: `${args.actionLabel} requires one canvas selector. Pass --canvas <id> or --canvas-name <query>.`,
      canvasId: null,
      canvasNameQuery: args.selector.canvasNameQuery,
    });
  }

  const loweredQuery = query.toLocaleLowerCase();
  const matches = args.rows.filter((row) => row.name.toLocaleLowerCase().includes(loweredQuery));
  if (matches.length === 1) return matches[0]!;

  if (matches.length === 0) {
    args.fail({
      ok: false,
      command: args.command,
      code: 'CANVAS_SELECTOR_NOT_FOUND',
      message: `Canvas name query '${query}' did not match any canvas.`,
      canvasId: null,
      canvasNameQuery: query,
    });
  }

  args.fail({
    ok: false,
    command: args.command,
    code: 'CANVAS_SELECTOR_AMBIGUOUS',
    message: `Canvas name query '${query}' matched ${matches.length} canvases. Pass --canvas <id> instead.`,
    canvasId: null,
    canvasNameQuery: query,
    matches: sortIds(matches.map((row) => row.name)).map((name) => {
      const row = matches.find((candidate) => candidate.name === name)!;
      return { id: row.id, name: row.name };
    }),
  });
}

export function resolveOutputMode(args: {
  output: string | undefined;
  command: string;
  fail: (error: { ok: false; command: string; code: string; message: string }) => never;
}): TSceneOutputMode {
  const mode = typeof args.output === 'string' ? args.output : 'summary';
  if (SCENE_OUTPUT_MODES.includes(mode as TSceneOutputMode)) return mode as TSceneOutputMode;
  args.fail({
    ok: false,
    command: args.command,
    code: 'CANVAS_OUTPUT_INVALID',
    message: `Invalid output mode '${mode}'. Expected one of: ${SCENE_OUTPUT_MODES.join(', ')}.`,
  });
}

export function toIsoString(value: Date | string | number): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') return new Date(value * 1000).toISOString();
  return new Date(value).toISOString();
}

export type { TCanvasSummary };
