import type { TCanvasRecord } from '@vibecanvas/db/IDbService';
import { toIsoString } from './fn.conversion';

export type TCanvasSummary = {
  id: string;
  name: string;
  automergeUrl: string;
  createdAt: string;
};

export type TCanvasSelectorInput = {
  canvasId?: string | null;
  canvasNameQuery?: string | null;
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
  const canvasId = selector.canvasId ?? null;
  const canvasNameQuery = selector.canvasNameQuery?.trim() || null;

  if (canvasId && canvasNameQuery) {
    throw {
      ok: false,
      command,
      code: 'CANVAS_SELECTOR_CONFLICT',
      message: 'Pass exactly one canvas selector: use either canvasId or canvasNameQuery.',
      canvasId,
      canvasNameQuery,
    };
  }

  if (!canvasId && !canvasNameQuery) {
    throw {
      ok: false,
      command,
      code: 'CANVAS_SELECTOR_REQUIRED',
      message: `${actionLabel} requires one canvas selector. Pass canvasId or canvasNameQuery.`,
      canvasId: null,
      canvasNameQuery: null,
    };
  }

  if (canvasId) {
    const match = rows.find((row) => row.id === canvasId);
    if (match) return match;
    throw {
      ok: false,
      command,
      code: 'CANVAS_SELECTOR_NOT_FOUND',
      message: `Canvas '${canvasId}' was not found.`,
      canvasId,
      canvasNameQuery: null,
    };
  }

  const query = canvasNameQuery as string;
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
    matches: [...matches]
      .sort((left, right) => {
        const nameCompare = left.name.localeCompare(right.name);
        if (nameCompare !== 0) return nameCompare;
        return left.id.localeCompare(right.id);
      })
      .map((row) => ({ id: row.id, name: row.name })),
  };
}
