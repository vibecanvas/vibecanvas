import { dirname, join, resolve } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { getEmbeddedMigrationPath, listEmbeddedMigrationFiles } from "./embedded-migrations";

type TArgs = {
  dataDir: string;
  cacheDir: string;
  db: Parameters<typeof migrate>[0];
  silent?: boolean;
};

type TBuildCandidateArgs = {
  envOverride?: string;
  isCompiled?: boolean;
  embeddedFolder?: string | null;
  execPath?: string;
  sourceDir?: string;
};

function hasMigrationJournal(pathname: string): boolean {
  return existsSync(join(pathname, "meta", "_journal.json"));
}

function hasEmbeddedMigrationAssets(): boolean {
  const files = listEmbeddedMigrationFiles();
  return files.length > 0 && files.includes("meta/_journal.json");
}

function fxExtractEmbeddedMigrations(cacheDir: string): string | null {
  if (!hasEmbeddedMigrationAssets()) {
    return null;
  }

  const outputDir = join(cacheDir, "database-migrations-embedded");
  const migrationFiles = listEmbeddedMigrationFiles();

  for (const relativePath of migrationFiles) {
    const sourcePath = getEmbeddedMigrationPath(relativePath);
    if (sourcePath === null) {
      continue;
    }

    const destinationPath = join(outputDir, relativePath);
    mkdirSync(dirname(destinationPath), { recursive: true });
    writeFileSync(destinationPath, readFileSync(sourcePath));
  }

  return hasMigrationJournal(outputDir) ? outputDir : null;
}

function buildMigrationsFolderCandidates(dataDir: string, cacheDir: string, args: TBuildCandidateArgs = {}): string[] {
  const envOverride = args.envOverride ?? process.env.VIBECANVAS_MIGRATIONS_DIR;
  const isCompiled = args.isCompiled ?? process.env.VIBECANVAS_COMPILED === "true";
  const embeddedFolder = args.embeddedFolder ?? fxExtractEmbeddedMigrations(cacheDir);
  const execPath = args.execPath ?? process.execPath;
  const sourceDir = args.sourceDir ?? resolve(import.meta.dir, "..", "..", "database-migrations");
  const sourceTreeFolder = isCompiled ? null : sourceDir;

  return [
    envOverride,
    sourceTreeFolder,
    join(dataDir, "database-migrations"),
    resolve(dirname(execPath), "..", "database-migrations"),
    embeddedFolder,
  ].filter(Boolean) as string[];
}

function resolveMigrationsFolder(dataDir: string, cacheDir: string): string {
  const candidates = buildMigrationsFolderCandidates(dataDir, cacheDir);

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
  const migrationsFolder = resolveMigrationsFolder(args.dataDir, args.cacheDir);

  if (!args.silent) {
    console.log(`[DB] Applying migrations from ${migrationsFolder}`);
  }

  migrate(args.db, { migrationsFolder });

  if (!args.silent) {
    console.log("[DB] Migrations complete");
  }
}

export default fxRunDatabaseMigrations;
export { buildMigrationsFolderCandidates, resolveMigrationsFolder };
