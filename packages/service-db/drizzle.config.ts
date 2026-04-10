import { defineConfig } from "drizzle-kit";
import { txConfigPath } from "@vibecanvas/shared-functions/vibecanvas-config/tx.config-path";
import { existsSync, mkdirSync } from "fs";

const [config] = txConfigPath({ fs: { existsSync, mkdirSync } });

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema.ts",
  out: "./database-migrations",
  dbCredentials: {
    url: config!.paths.databasePath
  }
});
