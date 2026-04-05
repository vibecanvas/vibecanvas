import type { TCanvasRecord } from '@vibecanvas/db/IDbService';
import { toIsoString } from './fn.conversion';

export type TCanvasSummary = {
  id: string;
  name: string;
  automergeUrl: string;
  createdAt: string;
};

export type TCanvasSelectorInput = {
  canvasId: string | null;
  canvasNameQuery: string | null;
};

export function fnSortIds(values: readonly string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

export function fnNormalizeCanvas(row: TCanvasRecord): TCanvasSummary {
  return {
    id: row.id,
    name: row.name,
    automergeUrl: row.automerge_url,
    createdAt: toIsoString(row.created_at),
  };
}

export function fnResolveCanvasSelection(args: {
  rows: TCanvasRecord[];
  selector: TCanvasSelectorInput;
  command: string;
  actionLabel: string;
}): TCanvasRecord {
  const { rows, selector, command, actionLabel } = args;

  if (selector.canvasId && selector.canvasNameQuery) {
    throw {
      ok: false,
      command,
      code: 'CANVAS_SELECTOR_CONFLICT',
      message: 'Pass exactly one canvas selector: use either canvasId or canvasNameQuery.',
      canvasId: selector.canvasId,
      canvasNameQuery: selector.canvasNameQuery,
    };
  }

  if (!selector.canvasId && !selector.canvasNameQuery) {
    throw {
      ok: false,
      command,
      code: 'CANVAS_SELECTOR_REQUIRED',
      message: `${actionLabel} requires one canvas selector. Pass canvasId or canvasNameQuery.`,
      canvasId: null,
      canvasNameQuery: null,
    };
  }

  if (selector.canvasId) {
    const match = rows.find((row) => row.id === selector.canvasId);
    if (match) return match;
    throw {
      ok: false,
      command,
      code: 'CANVAS_SELECTOR_NOT_FOUND',
      message: `Canvas '${selector.canvasId}' was not found.`,
      canvasId: selector.canvasId,
      canvasNameQuery: null,
    };
  }

  const query = selector.canvasNameQuery?.trim() ?? '';
  const matches = rows.filter((row) => row.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));

  if (matches.length === 1) return matches[0]!;

  if (matches.length === 0) {
    throw {
      ok: false,
      command,
      code: 'CANVAS_SELECTOR_NOT_FOUND',
      message: `Canvas name query '${query}' did not match any canvas.`,
      canvasId: null,
      canvasNameQuery: query,
    };
  }

  throw {
    ok: false,
    command,
    code: 'CANVAS_SELECTOR_AMBIGUOUS',
    message: `Canvas name query '${query}' matched ${matches.length} canvases. Pass canvasId instead.`,
    canvasId: null,
    canvasNameQuery: query,
    matches: fnSortIds(matches.map((row) => row.name)).map((name) => {
      const row = matches.find((candidate) => candidate.name === name)!;
      return { id: row.id, name: row.name };
    }),
  };
}
