import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import fxRunDatabaseMigrations from './fx.migrations';
import type { IDbConfig, IDbHandle, IDbService } from './interface';
import * as schema from './schema';

function configureSqlite(sqlite: Database) {
  sqlite.run('PRAGMA foreign_keys = ON');
  sqlite.run('PRAGMA journal_mode = WAL');
  sqlite.run('PRAGMA busy_timeout = 5000');
  sqlite.run('PRAGMA synchronous = NORMAL');
  sqlite.run('PRAGMA cache_size = 10000');
  sqlite.run('PRAGMA temp_store = MEMORY');
  sqlite.run('PRAGMA mmap_size = 268435456');
}

export function createSqliteDb(config: IDbConfig): IDbHandle {
  const sqlite = new Database(config.databasePath);
  configureSqlite(sqlite);

  const db = drizzle({ client: sqlite, schema }) as IDbService;

  fxRunDatabaseMigrations({
    dataDir: config.dataDir,
    cacheDir: config.cacheDir,
    db,
    sqlite,
    silent: config.silentMigrations,
  });

  return {
    db,
    sqlite,
    close() {
      sqlite.close();
    },
  };
}
