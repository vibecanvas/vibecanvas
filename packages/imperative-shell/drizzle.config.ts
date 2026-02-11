import { defineConfig } from "drizzle-kit";
import { txConfigPath } from "@vibecanvas/core/vibecanvas-config/index";
import { existsSync, mkdirSync } from "fs";

const [config] = txConfigPath({ fs: { existsSync, mkdirSync } });

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/database/schema.ts",
  out: "./database-migrations",
  dbCredentials: {
    url: config!.databasePath
  }
});
