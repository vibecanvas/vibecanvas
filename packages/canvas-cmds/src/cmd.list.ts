import type { TCanvasCmdContext } from './context';
import { toCanvasCmdError } from './errors';
import { toIsoString } from './scene-shared';

export type TCanvasInventoryEntry = {
  id: string;
  name: string;
  createdAt: string;
  automergeUrl: string;
};

export type TCanvasListSuccess = {
  ok: true;
  command: 'canvas';
  subcommand: 'list';
  dbPath: string;
  count: number;
  canvases: TCanvasInventoryEntry[];
};

export async function executeCanvasList(ctx: TCanvasCmdContext): Promise<TCanvasListSuccess> {
  try {
    const rows = await ctx.listCanvasRows();
    const canvases = rows
      .slice()
      .sort((left, right) => {
        const leftCreated = new Date(left.created_at).getTime();
        const rightCreated = new Date(right.created_at).getTime();
        if (leftCreated !== rightCreated) return leftCreated - rightCreated;
        if (left.name !== right.name) return left.name.localeCompare(right.name);
        return left.id.localeCompare(right.id);
      })
      .map((row) => ({
        id: row.id,
        name: row.name,
        createdAt: toIsoString(row.created_at),
        automergeUrl: row.automerge_url,
      } satisfies TCanvasInventoryEntry));

    return {
      ok: true,
      command: 'canvas',
      subcommand: 'list',
      dbPath: ctx.dbPath,
      count: canvases.length,
      canvases,
    };
  } catch (error) {
    throw toCanvasCmdError({
      command: 'canvas',
      code: 'CANVAS_LIST_FAILED',
      message: error instanceof Error ? error.message : String(error),
      dbPath: ctx.dbPath,
    });
  }
}
