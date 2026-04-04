import type { IService, IStoppableService } from '@vibecanvas/runtime';
import type * as schema from './schema';

type TCanvasRecord = typeof schema.canvas.$inferSelect;
type TFileTreeRecord = typeof schema.filetrees.$inferSelect;
type TFileRecord = typeof schema.files.$inferSelect;
type TFileFormat = typeof schema.files.$inferSelect['format'];

type TGetFullCanvasResult = {
  canvas: TCanvasRecord;
  fileTrees: TFileTreeRecord[];
};

type TUpdateCanvasArgs = {
  id: string;
  name?: string;
  path?: string;
};

type TCreateFileArgs = {
  id: string;
  hash: string;
  format: TFileFormat;
  base64: string;
};

type TGetFileArgs = {
  id: string;
  format: TFileFormat;
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
  createFile(args: TCreateFileArgs): TFileRecord;
  getFile(args: TGetFileArgs): TFileRecord | null;
  deleteFile(id: string): void;
}

export type {
  TCanvasRecord,
  TCreateFileArgs,
  TFileFormat,
  TFileRecord,
  TFileTreeRecord,
  TGetFileArgs,
  TGetFullCanvasResult,
  TUpdateCanvasArgs,
};
