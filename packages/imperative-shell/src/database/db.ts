import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as schema from './schema';
import { txConfigPath } from '@vibecanvas/core/vibecanvas-config/index';
import { existsSync, mkdirSync } from "fs";
import fxRunDatabaseMigrations from './fx.migrations';

const [config, configError] = txConfigPath({ fs: { existsSync, mkdirSync } });
if (configError) {
  console.error(configError)
  process.exit(1)
}
const sqlite = new Database(config!.databasePath);
sqlite.run(`PRAGMA foreign_keys = ON`)
sqlite.run(`PRAGMA journal_mode = WAL`)
sqlite.run(`PRAGMA busy_timeout = 5000`)
sqlite.run(`PRAGMA synchronous = NORMAL`)
sqlite.run(`PRAGMA cache_size = 10000`)
sqlite.run(`PRAGMA temp_store = MEMORY`)
// 256MB
sqlite.run(`PRAGMA mmap_size = 268435456`)

const db = drizzle({ client: sqlite, schema });

fxRunDatabaseMigrations({
  configDir: config!.configDir,
  db,
});

export default db;
