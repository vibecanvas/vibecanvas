import { dirname, join, resolve } from "path";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { getEmbeddedMigrationContent, listEmbeddedMigrationFiles } from "./embedded-migrations";

type TArgs = {
  configDir: string;
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

function fxExtractEmbeddedMigrations(configDir: string): string | null {
  if (!hasEmbeddedMigrationAssets()) {
    return null;
  }

  const outputDir = join(configDir, "database-migrations-embedded");
  const migrationFiles = listEmbeddedMigrationFiles();

  for (const relativePath of migrationFiles) {
    const sourceContent = getEmbeddedMigrationContent(relativePath);
    if (sourceContent === null) {
      continue;
    }

    const destinationPath = join(outputDir, relativePath);
    mkdirSync(dirname(destinationPath), { recursive: true });
    writeFileSync(destinationPath, sourceContent);
  }

  return hasMigrationJournal(outputDir) ? outputDir : null;
}

function buildMigrationsFolderCandidates(configDir: string, args: TBuildCandidateArgs = {}): string[] {
  const envOverride = args.envOverride ?? process.env.VIBECANVAS_MIGRATIONS_DIR;
  const isCompiled = args.isCompiled ?? process.env.VIBECANVAS_COMPILED === "true";
  const embeddedFolder = args.embeddedFolder ?? fxExtractEmbeddedMigrations(configDir);
  const execPath = args.execPath ?? process.execPath;
  const sourceDir = args.sourceDir ?? resolve(import.meta.dir, "..", "..", "database-migrations");
  const sourceTreeFolder = isCompiled ? null : sourceDir;

  return [
    envOverride,
    join(configDir, "database-migrations"),
    resolve(dirname(execPath), "..", "database-migrations"),
    embeddedFolder,
    sourceTreeFolder,
  ].filter(Boolean) as string[];
}

function resolveMigrationsFolder(configDir: string): string {
  const candidates = buildMigrationsFolderCandidates(configDir);

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
export { buildMigrationsFolderCandidates, resolveMigrationsFolder };
