import type { IService, IStoppableService } from '@vibecanvas/runtime';
import type * as schema from './schema';

type TCanvasRecord = typeof schema.canvas.$inferSelect;
type TCanvasInsertArgs = typeof schema.canvas.$inferInsert;
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
};

type TCreateFileTreeArgs = {
  canvas_id: string;
  title: string;
  path: string;
  locked?: boolean;
  glob_pattern?: string | null;
};

type TUpdateFileTreeArgs = {
  id: string;
  title?: string;
  path?: string;
  locked?: boolean;
  glob_pattern?: string | null;
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
  canvas: {
    listAll(): TCanvasRecord[];
    findByName(name: string): TCanvasRecord | null;
    create(args: TCanvasInsertArgs): TCanvasRecord;
    renameById(args: { id: string, name: string }): TCanvasRecord;
    deleteById(args: { id: string }): TCanvasRecord[];
  };
  fileTree: {
    listAll(): TFileTreeRecord[];
    listByCanvasId(canvas_id: string): TFileTreeRecord[];
    create(args: TCreateFileTreeArgs): TFileTreeRecord;
    update(args: TUpdateFileTreeArgs): TFileTreeRecord | null;
    deleteById(args: { id: string }): boolean;
  };
  file: {
    listAll(): TFileRecord[];
    create(args: TCreateFileArgs): TFileRecord;
    get(args: TGetFileArgs): TFileRecord | null;
    deleteById(args: { id: string }): void;
  };
  getFullCanvas(id: string): TGetFullCanvasResult | null;
}

export type {
  TCanvasRecord,
  TCreateFileArgs,
  TCreateFileTreeArgs,
  TFileFormat,
  TFileRecord,
  TFileTreeRecord,
  TGetFileArgs,
  TGetFullCanvasResult,
  TUpdateCanvasArgs,
  TUpdateFileTreeArgs,
  TCanvasInsertArgs
};
