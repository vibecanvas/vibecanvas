import { dirname, join, resolve } from "path";
import { existsSync } from "fs";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

type TArgs = {
  configDir: string;
  db: Parameters<typeof migrate>[0];
  silent?: boolean;
};

function hasMigrationJournal(pathname: string): boolean {
  return existsSync(join(pathname, "meta", "_journal.json"));
}

function resolveMigrationsFolder(configDir: string): string {
  const envOverride = process.env.VIBECANVAS_MIGRATIONS_DIR;
  const candidates = [
    envOverride,
    join(configDir, "database-migrations"),
    resolve(dirname(process.execPath), "..", "database-migrations"),
    resolve(import.meta.dir, "..", "..", "database-migrations"),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (hasMigrationJournal(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Database migrations folder not found. Checked: ${candidates.join(", ")}`
  );
}

function fxRunDatabaseMigrations(args: TArgs): void {
  const migrationsFolder = resolveMigrationsFolder(args.configDir);

  if (!args.silent) {
    console.log(`[DB] Applying migrations from ${migrationsFolder}`);
  }

  migrate(args.db, { migrationsFolder });

  if (!args.silent) {
    console.log("[DB] Migrations complete");
  }
}

export default fxRunDatabaseMigrations;
export { resolveMigrationsFolder };
