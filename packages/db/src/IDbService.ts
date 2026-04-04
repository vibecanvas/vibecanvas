import type { IService, IStoppableService } from '@vibecanvas/runtime';
import type * as schema from './schema';

type TCanvasRecord = typeof schema.canvas.$inferSelect;
type TFileTreeRecord = typeof schema.filetrees.$inferSelect;

type TGetFullCanvasResult = {
  canvas: TCanvasRecord;
  fileTrees: TFileTreeRecord[];
};

type TUpdateCanvasArgs = {
  id: string;
  name?: string;
  path?: string;
};

/**
 * Abstract database service contract.
 *
 * Important: this interface should not know about Drizzle, SQLite, or any
 * concrete persistence technology. Implementation-specific query surfaces live
 * on concrete classes like `DbServiceBunSqlite`.
 */
export interface IDbService extends IService, IStoppableService {
  listCanvas(): TCanvasRecord[];
  getFullCanvas(id: string): TGetFullCanvasResult | null;
  updateCanvas(args: TUpdateCanvasArgs): TCanvasRecord | null;
}

export type { TCanvasRecord, TFileTreeRecord, TGetFullCanvasResult, TUpdateCanvasArgs };
