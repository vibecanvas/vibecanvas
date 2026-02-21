import { txConfigPath } from "@vibecanvas/core/vibecanvas-config/tx.config-path";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { existsSync, mkdirSync } from "fs";
import fxRunDatabaseMigrations from "./fx.migrations";

const [config, err] = txConfigPath({ fs: { existsSync, mkdirSync } });

if (err) {
  console.error("Failed to get config path:", err.internalMessage);
  process.exit(1);
}

console.log(`Database path: ${config.databasePath}`);

const sqlite = new Database(config.databasePath);
const db = drizzle(sqlite);

fxRunDatabaseMigrations({
  configDir: config.configDir,
  db,
});

sqlite.close();
