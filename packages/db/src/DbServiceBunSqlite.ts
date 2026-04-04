import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { and, eq } from 'drizzle-orm';
import { fxRunDatabaseMigrations } from './core/fx.migrations';
import type { IDbConfig } from './interface';
import type {
  IDbService,
  TCanvasRecord,
  TCreateFileArgs,
  TFileRecord,
  TGetFileArgs,
  TGetFullCanvasResult,
  TUpdateCanvasArgs,
} from './IDbService';
import * as schema from './schema';

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

  stop() {
    this.sqlite.close();
  }

  listCanvas(): TCanvasRecord[] {
    return this.drizzle.query.canvas.findMany().sync();
  }

  getFullCanvas(id: string): TGetFullCanvasResult | null {
    const canvas = this.drizzle.query.canvas.findFirst({ where: eq(schema.canvas.id, id) }).sync();
    if (!canvas) return null;

    const fileTrees = this.drizzle.query.filetrees.findMany({ where: eq(schema.filetrees.canvas_id, id) }).sync();

    return {
      canvas,
      fileTrees,
    };
  }

  updateCanvas(args: TUpdateCanvasArgs): TCanvasRecord | null {
    const updateData: Partial<typeof schema.canvas.$inferInsert> = {};
    if (args.name !== undefined) updateData.name = args.name;

    const result = this.drizzle
      .update(schema.canvas)
      .set(updateData)
      .where(eq(schema.canvas.id, args.id))
      .returning()
      .all();

    return result[0] ?? null;
  }

  createFile(args: TCreateFileArgs): TFileRecord {
    this.drizzle.insert(schema.files).values({
      id: args.id,
      hash: args.hash,
      format: args.format,
      base64: args.base64,
    }).run();

    const record = this.getFile({ id: args.id, format: args.format });
    if (!record) {
      throw new Error('Failed to create file record');
    }

    return record;
  }

  getFile(args: TGetFileArgs): TFileRecord | null {
    return this.drizzle.query.files.findFirst({
      where: (table) => and(
        eq(table.id, args.id),
        eq(table.format, args.format),
      ),
    }).sync() ?? null;
  }

  deleteFile(id: string): void {
    this.drizzle.delete(schema.files).where(eq(schema.files.id, id)).run();
  }
}

export function createSqliteDb(config: IDbConfig): DbServiceBunSqlite {
  return new DbServiceBunSqlite(config);
}
