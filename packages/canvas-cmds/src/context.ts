import type { DocHandle } from '@automerge/automerge-repo';
import type { TCanvasDoc } from '@vibecanvas/shell/automerge/index';

export type TCanvasRow = {
  id: string;
  name: string;
  automerge_url: string;
  created_at: Date | string | number;
};

export type TCanvasSummary = {
  id: string;
  name: string;
  automergeUrl: string;
  createdAt: string;
};

export type TCanvasSelector = {
  canvasId: string | null;
  canvasNameQuery: string | null;
};

export type TCanvasDocHandle = {
  handle: DocHandle<TCanvasDoc>;
  source: 'offline' | 'live';
};

export type TWaitForCanvasMutationArgs = {
  source: 'offline' | 'live';
  handle: DocHandle<TCanvasDoc>;
  automergeUrl: string;
  predicate: (doc: TCanvasDoc) => boolean;
};

export type TCanvasCmdContext = {
  dbPath: string;
  listCanvasRows(): Promise<TCanvasRow[]>;
  loadCanvasHandle(row: TCanvasRow): Promise<TCanvasDocHandle>;
  waitForMutation(args: TWaitForCanvasMutationArgs): Promise<TCanvasDoc>;
};

export function normalizeCanvas(row: TCanvasRow): TCanvasSummary {
  const createdAt = row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString();
  return { id: row.id, name: row.name, automergeUrl: row.automerge_url, createdAt };
}
