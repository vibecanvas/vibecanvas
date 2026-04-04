import type { TCanvasDoc } from '@vibecanvas/shell/automerge/index';
import { getTargetBounds, isGroupInSubtree, sortSceneTargets, type TSceneBounds, type TSceneTarget } from './scene-shared';
import type { TCanvasCmdErrorDetails } from './errors';

export type TSceneSelectorSource = 'none' | 'flags' | 'where' | 'query';
export type TSceneSelectorScalar = string | number | boolean | null;
export type TSceneStyleFilter = Record<string, TSceneSelectorScalar>;

export type TSceneSelector = {
  ids: string[];
  kinds: Array<'element' | 'group'>;
  types: string[];
  style: TSceneStyleFilter;
  group: string | null;
  subtree: string | null;
  bounds: TSceneBounds | null;
  boundsMode: 'intersects' | 'contains';
};

export type TSceneSelectorEnvelope = {
  source: TSceneSelectorSource;
  canvasId: string | null;
  canvasNameQuery: string | null;
  filters: TSceneSelector;
};

type TSceneSelectorError = TCanvasCmdErrorDetails & {
  canvasId?: string | null;
  canvasNameQuery?: string | null;
};

type TSceneSelectorContext = {
  command: string;
  canvasId: string | null;
  canvasNameQuery: string | null;
  fail: (error: TSceneSelectorError) => never;
};

const VALID_QUERY_KINDS = new Set(['element', 'group']);
const VALID_BOUNDS_MODES = new Set(['intersects', 'contains']);

function toCommandCode(command: string, suffix: string): string {
  return `${command.replaceAll('.', '_').toUpperCase()}_${suffix}`;
}

function failSceneSelector(context: TSceneSelectorContext, suffix: string, message: string): never {
  context.fail({
    ok: false,
    command: context.command,
    code: toCommandCode(context.command, suffix),
    message,
    canvasId: context.canvasId,
    canvasNameQuery: context.canvasNameQuery,
  });
}

export function createEmptySelector(): TSceneSelector {
  return { ids: [], kinds: [], types: [], style: {}, group: null, subtree: null, bounds: null, boundsMode: 'intersects' };
}

function hasStructuredSelector(values: Record<string, unknown>): boolean {
  return values.id !== undefined || values.kind !== undefined || values.type !== undefined || values.style !== undefined || values.group !== undefined || values.subtree !== undefined || values.bounds !== undefined || values['bounds-mode'] !== undefined;
}

export function normalizeStringList(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return raw.flatMap((entry) => typeof entry === 'string' ? entry.split(',') : []).map((entry) => entry.trim()).filter(Boolean).sort((left, right) => left.localeCompare(right));
}

function parseBounds(raw: unknown, context: TSceneSelectorContext): TSceneBounds {
  if (typeof raw === 'object' && raw !== null) {
    const candidate = raw as Record<string, unknown>;
    if (typeof candidate.x === 'number' && typeof candidate.y === 'number' && typeof candidate.w === 'number' && typeof candidate.h === 'number') {
      return { x: candidate.x, y: candidate.y, w: candidate.w, h: candidate.h };
    }
  }

  if (typeof raw === 'string') {
    const parts = raw.split(',').map((entry) => Number(entry.trim()));
    if (parts.length === 4 && parts.every((part) => Number.isFinite(part))) {
      return { x: parts[0]!, y: parts[1]!, w: parts[2]!, h: parts[3]! };
    }
  }

  failSceneSelector(context, 'BOUNDS_INVALID', 'Invalid bounds selector. Expected x,y,w,h or { x, y, w, h }.');
}

function parseBoundsMode(raw: unknown, context: TSceneSelectorContext): 'intersects' | 'contains' {
  const mode = typeof raw === 'string' ? raw : 'intersects';
  if (VALID_BOUNDS_MODES.has(mode)) return mode as 'intersects' | 'contains';
  failSceneSelector(context, 'BOUNDS_MODE_INVALID', `Invalid bounds mode '${String(raw)}'. Expected one of: intersects, contains.`);
}

function parseKinds(raw: unknown, context: TSceneSelectorContext): Array<'element' | 'group'> {
  const kinds = normalizeStringList(raw);
  for (const kind of kinds) {
    if (VALID_QUERY_KINDS.has(kind)) continue;
    failSceneSelector(context, 'KIND_INVALID', `Invalid kind '${kind}'. Expected one of: element, group.`);
  }
  return kinds as Array<'element' | 'group'>;
}

function parseScalarString(value: string): TSceneSelectorScalar {
  const trimmed = value.trim();
  if (trimmed === 'null') return null;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

function normalizeStyleFilterEntries(entries: Array<[string, TSceneSelectorScalar]>): TSceneStyleFilter {
  return Object.fromEntries(entries.filter(([key]) => key.trim().length > 0).sort(([left], [right]) => left.localeCompare(right)));
}

function parseStyleAssignment(raw: string, context: TSceneSelectorContext): [string, TSceneSelectorScalar] {
  const separatorIndex = raw.indexOf('=');
  const key = separatorIndex >= 0 ? raw.slice(0, separatorIndex).trim() : '';
  const value = separatorIndex >= 0 ? raw.slice(separatorIndex + 1) : '';
  if (!key) failSceneSelector(context, 'STYLE_INVALID', 'Invalid style selector. Expected key=value.');
  return [key, parseScalarString(value)];
}

function parseStyleFilter(raw: unknown, context: TSceneSelectorContext): TSceneStyleFilter {
  if (raw === undefined) return {};

  if (Array.isArray(raw)) {
    return normalizeStyleFilterEntries(raw.map((entry) => {
      if (typeof entry !== 'string') failSceneSelector(context, 'STYLE_INVALID', 'Invalid style selector. Expected key=value.');
      return parseStyleAssignment(entry, context);
    }));
  }

  if (typeof raw === 'string') {
    return normalizeStyleFilterEntries([parseStyleAssignment(raw, context)]);
  }

  if (typeof raw === 'object' && raw !== null) {
    const entries = Object.entries(raw as Record<string, unknown>).map(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
        return [key, value] satisfies [string, TSceneSelectorScalar];
      }

      failSceneSelector(context, 'STYLE_INVALID', 'Invalid style selector value. Expected string, number, boolean, or null.');
    });

    return normalizeStyleFilterEntries(entries);
  }

  failSceneSelector(context, 'STYLE_INVALID', 'Invalid style selector. Expected key=value or a style object.');
}

function parseStructuredSelector(values: Record<string, unknown>, context: TSceneSelectorContext): TSceneSelector {
  return {
    ids: normalizeStringList(values.id),
    kinds: parseKinds(values.kind, context),
    types: normalizeStringList(values.type),
    style: parseStyleFilter(values.style, context),
    group: typeof values.group === 'string' && values.group.trim() ? values.group.trim() : null,
    subtree: typeof values.subtree === 'string' && values.subtree.trim() ? values.subtree.trim() : null,
    bounds: values.bounds === undefined ? null : parseBounds(values.bounds, context),
    boundsMode: parseBoundsMode(values['bounds-mode'], context),
  };
}

function parseWhereSelector(raw: string, context: TSceneSelectorContext): TSceneSelector {
  const params = new URLSearchParams(raw);
  const selector = createEmptySelector();
  selector.style = normalizeStyleFilterEntries(Array.from(params.entries()).filter(([key]) => key.startsWith('style.')).map(([key, value]) => [key.slice('style.'.length), parseScalarString(value)]));
  selector.ids = normalizeStringList(params.getAll('id'));
  selector.kinds = parseKinds(params.getAll('kind'), context);
  selector.types = normalizeStringList(params.getAll('type'));
  selector.group = params.get('group')?.trim() || null;
  selector.subtree = params.get('subtree')?.trim() || null;
  if (params.has('bounds')) selector.bounds = parseBounds(params.get('bounds'), context);
  selector.boundsMode = parseBoundsMode(params.get('bounds-mode') ?? undefined, context);
  return selector;
}

function parseQuerySelector(raw: string, context: TSceneSelectorContext): TSceneSelector {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    failSceneSelector(context, 'JSON_INVALID', 'Invalid query JSON payload.');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    failSceneSelector(context, 'JSON_INVALID', 'Invalid query JSON payload.');
  }

  const candidate = parsed as Record<string, unknown>;
  return {
    ids: normalizeStringList(candidate.ids),
    kinds: parseKinds(candidate.kinds, context),
    types: normalizeStringList(candidate.types),
    style: parseStyleFilter(candidate.style, context),
    group: typeof candidate.group === 'string' && candidate.group.trim() ? candidate.group.trim() : null,
    subtree: typeof candidate.subtree === 'string' && candidate.subtree.trim() ? candidate.subtree.trim() : null,
    bounds: candidate.bounds === undefined ? null : parseBounds(candidate.bounds, context),
    boundsMode: parseBoundsMode(candidate.boundsMode, context),
  };
}

export function resolveSelectorEnvelope(args: {
  values: Record<string, unknown>;
  canvasId: string | null;
  canvasNameQuery: string | null;
  command: string;
  fail: (error: TSceneSelectorError) => never;
}): TSceneSelectorEnvelope {
  const context: TSceneSelectorContext = {
    command: args.command,
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
    fail: args.fail,
  };
  const hasFlags = hasStructuredSelector(args.values);
  const hasWhere = typeof args.values.where === 'string' && args.values.where.trim().length > 0;
  const hasQuery = typeof args.values.query === 'string' && args.values.query.trim().length > 0;
  const selectorInputCount = [hasFlags, hasWhere, hasQuery].filter(Boolean).length;

  if (selectorInputCount > 1) {
    failSceneSelector(context, 'SELECTOR_CONFLICT', 'Pass at most one selector input style: structured flags, where, or query.');
  }

  if (hasWhere) {
    return {
      source: 'where',
      canvasId: args.canvasId,
      canvasNameQuery: args.canvasNameQuery,
      filters: parseWhereSelector(args.values.where as string, context),
    };
  }

  if (hasQuery) {
    return {
      source: 'query',
      canvasId: args.canvasId,
      canvasNameQuery: args.canvasNameQuery,
      filters: parseQuerySelector(args.values.query as string, context),
    };
  }

  if (hasFlags) {
    return {
      source: 'flags',
      canvasId: args.canvasId,
      canvasNameQuery: args.canvasNameQuery,
      filters: parseStructuredSelector(args.values, context),
    };
  }

  return {
    source: 'none',
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
    filters: createEmptySelector(),
  };
}

function intersectsBounds(filter: TSceneBounds, candidate: TSceneBounds): boolean {
  return filter.x < candidate.x + candidate.w && filter.x + filter.w > candidate.x && filter.y < candidate.y + candidate.h && filter.y + filter.h > candidate.y;
}

function containsBounds(filter: TSceneBounds, candidate: TSceneBounds): boolean {
  return candidate.x >= filter.x && candidate.y >= filter.y && candidate.x + candidate.w <= filter.x + filter.w && candidate.y + candidate.h <= filter.y + filter.h;
}

export function createSceneTargets(doc: TCanvasDoc): TSceneTarget[] {
  return sortSceneTargets(doc, [
    ...Object.values(doc.groups).map((group) => ({ kind: 'group', group }) satisfies TSceneTarget),
    ...Object.values(doc.elements).map((element) => ({ kind: 'element', element }) satisfies TSceneTarget),
  ]);
}

export function validateGroupSelector(args: {
  doc: TCanvasDoc;
  selector: TSceneSelector;
  command: string;
  canvasId: string;
  canvasNameQuery: string | null;
  fail: (error: TSceneSelectorError) => never;
}): void {
  const context: TSceneSelectorContext = {
    command: args.command,
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
    fail: args.fail,
  };

  if (args.selector.group && !args.doc.groups[args.selector.group]) {
    failSceneSelector(context, 'GROUP_NOT_FOUND', `Group '${args.selector.group}' was not found in canvas '${args.doc.name}'.`);
  }

  if (args.selector.subtree && !args.doc.groups[args.selector.subtree]) {
    failSceneSelector(context, 'SUBTREE_NOT_FOUND', `Subtree root '${args.selector.subtree}' was not found in canvas '${args.doc.name}'.`);
  }
}

function matchesStyleSelector(target: TSceneTarget, styleFilter: TSceneStyleFilter): boolean {
  const styleEntries = Object.entries(styleFilter);
  if (styleEntries.length === 0) return true;
  if (target.kind !== 'element') return false;
  return styleEntries.every(([key, value]) => target.element.style[key as keyof typeof target.element.style] === value);
}

export function matchesSceneSelector(target: TSceneTarget, doc: TCanvasDoc, selector: TSceneSelector): boolean {
  const id = target.kind === 'element' ? target.element.id : target.group.id;
  const kind = target.kind;
  const type = target.kind === 'element' ? target.element.data.type : null;
  const parentGroupId = target.kind === 'element' ? target.element.parentGroupId : target.group.parentGroupId;
  const bounds = getTargetBounds(doc, target);

  if (selector.ids.length > 0 && !selector.ids.includes(id)) return false;
  if (selector.kinds.length > 0 && !selector.kinds.includes(kind)) return false;
  if (selector.types.length > 0 && (type === null || !selector.types.includes(type))) return false;
  if (!matchesStyleSelector(target, selector.style)) return false;
  if (selector.group !== null && parentGroupId !== selector.group) return false;

  if (selector.subtree !== null) {
    if (target.kind === 'group') {
      if (!isGroupInSubtree(doc, target.group.id, selector.subtree)) return false;
    } else if (!parentGroupId || !isGroupInSubtree(doc, parentGroupId, selector.subtree)) {
      return false;
    }
  }

  if (selector.bounds !== null) {
    if (!bounds) return false;
    if (selector.boundsMode === 'intersects' && !intersectsBounds(selector.bounds, bounds)) return false;
    if (selector.boundsMode === 'contains' && !containsBounds(selector.bounds, bounds)) return false;
  }

  return true;
}
