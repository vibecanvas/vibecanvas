import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { eq } from 'drizzle-orm';
import { fxRunDatabaseMigrations } from '../core/fx.migrations';
import type { IDbConfig } from '../interface';
import type {
  IDbService,
  TCanvasInsertArgs,
  TCanvasRecord,
  TCreateFileArgs,
  TCreateFileTreeArgs,
  TFileRecord,
  TFileTreeRecord,
  TGetFileArgs,
  TGetFullCanvasResult,
  TUpdateFileTreeArgs,
} from '../IDbService';
import * as schema from '../schema';
import { fxGetFile } from './fx.get-file';
import { fxGetFullCanvas } from './fx.get-full-canvas';
import { txCreateFile } from './tx.create-file';
import { txCreateFileTree } from './tx.create-file-tree';
import { txDeleteFileTree } from './tx.delete-file-tree';
import { txUpdateCanvas } from './tx.update-canvas';
import { txUpdateFileTree } from './tx.update-file-tree';

export type TDbSchema = typeof schema;
export type TDrizzleDb = BunSQLiteDatabase<TDbSchema>;

function configureSqlite(sqlite: Database) {
  sqlite.run('PRAGMA foreign_keys = ON');
  sqlite.run('PRAGMA journal_mode = WAL');
  sqlite.run('PRAGMA busy_timeout = 5000');
  sqlite.run('PRAGMA synchronous = NORMAL');
  sqlite.run('PRAGMA cache_size = 10000');
  sqlite.run('PRAGMA temp_store = MEMORY');
  sqlite.run('PRAGMA mmap_size = 268435456');
}

export class DbServiceBunSqlite implements IDbService {
  readonly name = 'db' as const;
  readonly sqlite: Database;
  readonly drizzle: TDrizzleDb;

  constructor(private readonly config: IDbConfig) {
    this.sqlite = new Database(config.databasePath);
    configureSqlite(this.sqlite);

    this.drizzle = drizzle({ client: this.sqlite, schema });

    fxRunDatabaseMigrations({
      dataDir: config.dataDir,
      cacheDir: config.cacheDir,
      db: this.drizzle,
      sqlite: this.sqlite,
      silent: config.silentMigrations,
    });
  }

  canvas = {
    listAll: () => this.drizzle.query.canvas.findMany().sync() as TCanvasRecord[],
    create: (args: TCanvasInsertArgs) => this.drizzle.insert(schema.canvas).values(args).returning().all()[0]!,
    renameById: (args: { id: string, name: string }) => this.drizzle.update(schema.canvas).set({ name: args.name }).where(eq(schema.canvas.id, args.id)).returning().all()[0]!,
    deleteById: (args: { id: string }) => this.drizzle.delete(schema.canvas).where(eq(schema.canvas.id, args.id)).returning().all()[0]!,
  };

  fileTree = {
    listAll: () => this.drizzle.query.filetrees.findMany().sync() as TFileTreeRecord[],
    listByCanvasId: (canvas_id: string) => this.drizzle.query.filetrees.findMany({ where: eq(schema.filetrees.canvas_id, canvas_id) }).sync() as TFileTreeRecord[],
    create: (args: TCreateFileTreeArgs) => txCreateFileTree(this, args),
    update: (args: TUpdateFileTreeArgs) => txUpdateFileTree(this, args),
    deleteById: (args: { id: string }) => txDeleteFileTree(this, args.id),
  };

  file = {
    listAll: () => this.drizzle.query.files.findMany().sync() as TFileRecord[],
    create: (args: TCreateFileArgs) => txCreateFile(this, args),
    get: (args: TGetFileArgs) => fxGetFile(this, args),
    deleteById: (args: { id: string }) => this.drizzle.delete(schema.files).where(eq(schema.files.id, args.id)).run(),
  };

  stop() {
    this.sqlite.close();
  }

  getFullCanvas(id: string): TGetFullCanvasResult | null {
    return fxGetFullCanvas(this, id);
  }
}

export function createSqliteDb(config: IDbConfig): DbServiceBunSqlite {
  return new DbServiceBunSqlite(config);
}
