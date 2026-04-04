import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { fxRunDatabaseMigrations } from './core/fx.migrations';
import { fxResolveConfiguredDb } from './core/fx.resolve-config';
import type { IDbConfig } from './interface';
import type { IDbService } from './IDbService';
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
}

export function createSqliteDb(config: IDbConfig): DbServiceBunSqlite {
  return new DbServiceBunSqlite(config);
}

export function createConfiguredSqliteDb(): DbServiceBunSqlite {
  return new DbServiceBunSqlite(fxResolveConfiguredDb());
}
