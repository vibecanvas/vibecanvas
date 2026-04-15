import type { Database } from 'bun:sqlite';

type TJournalEntry = {
  idx: number;
  when: number;
  tag: string;
  breakpoints: boolean;
};

type TEmbeddedMigrationsModule = {
  getEmbeddedMigrationPath: (relativePath: string) => string | null;
  listEmbeddedMigrationFiles: () => string[];
};

type TPortalMigrations = {
  env: {
    VIBECANVAS_MIGRATIONS_DIR?: string;
    VIBECANVAS_COMPILED?: string;
  };
  paths: {
    dirname: typeof import('path').dirname;
    join: typeof import('path').join;
    resolve: typeof import('path').resolve;
    importMetaDir: string;
    execPath: string;
  };
  fs: {
    existsSync: typeof import('fs').existsSync;
    mkdirSync: typeof import('fs').mkdirSync;
    readFileSync: typeof import('fs').readFileSync;
    writeFileSync: typeof import('fs').writeFileSync;
  };
  loadEmbeddedMigrationsModule: () => Promise<TEmbeddedMigrationsModule | null>;
};

type TArgsHasMigrationJournal = {
  pathname: string;
};

type TArgsExtractEmbeddedMigrations = {
  cacheDir: string;
};

type TArgsBuildMigrationsFolderCandidates = {
  dataDir: string;
  cacheDir: string;
  envOverride?: string;
  isCompiled?: boolean;
  embeddedFolder?: string | null;
  execPath?: string;
  sourceDir?: string;
};

type TArgsResolveMigrationsFolder = {
  dataDir: string;
  cacheDir: string;
};

type TArgsReadMigrationJournalEntries = {
  migrationsFolder: string;
};

type TArgsShouldBootstrapLegacyMigrationState = {
  sqlite: {
    query: (sql: string) => { get(...args: unknown[]): unknown };
  };
};

const MIGRATIONS_TABLE = '__drizzle_migrations';
const legacyBootstrapTables = ['automerge_repo_data', 'canvas', 'files'] as const;

type TArgsHasEmbeddedMigrationAssets = {
  embeddedModule: TEmbeddedMigrationsModule | null;
};

function hasEmbeddedMigrationAssets(_portal: TPortalMigrations, args: TArgsHasEmbeddedMigrationAssets): args is { embeddedModule: TEmbeddedMigrationsModule } {
  if (args.embeddedModule === null) {
    return false;
  }

  const files = args.embeddedModule.listEmbeddedMigrationFiles();
  return files.length > 0 && files.includes('meta/_journal.json');
}

export function fxHasMigrationJournal(portal: TPortalMigrations, args: TArgsHasMigrationJournal): boolean {
  return portal.fs.existsSync(portal.paths.join(args.pathname, 'meta', '_journal.json'));
}

export async function fxExtractEmbeddedMigrations(portal: TPortalMigrations, args: TArgsExtractEmbeddedMigrations): Promise<string | null> {
  const embeddedModule = await portal.loadEmbeddedMigrationsModule();

  if (!hasEmbeddedMigrationAssets(portal, { embeddedModule })) {
    return null;
  }

  const outputDir = portal.paths.join(args.cacheDir, 'database-migrations-embedded');
  const migrationFiles = embeddedModule.listEmbeddedMigrationFiles();

  for (const relativePath of migrationFiles) {
    const sourcePath = embeddedModule.getEmbeddedMigrationPath(relativePath);
    if (sourcePath === null) {
      continue;
    }

    const destinationPath = portal.paths.join(outputDir, relativePath);
    portal.fs.mkdirSync(portal.paths.dirname(destinationPath), { recursive: true });
    portal.fs.writeFileSync(destinationPath, portal.fs.readFileSync(sourcePath));
  }

  return fxHasMigrationJournal(portal, { pathname: outputDir }) ? outputDir : null;
}

export async function fxBuildMigrationsFolderCandidates(portal: TPortalMigrations, args: TArgsBuildMigrationsFolderCandidates): Promise<string[]> {
  const envOverride = args.envOverride ?? portal.env.VIBECANVAS_MIGRATIONS_DIR;
  const isCompiled = args.isCompiled ?? portal.env.VIBECANVAS_COMPILED === 'true';
  const embeddedFolder = args.embeddedFolder ?? await fxExtractEmbeddedMigrations(portal, { cacheDir: args.cacheDir });
  const execPath = args.execPath ?? portal.paths.execPath;
  const sourceDir = args.sourceDir ?? portal.paths.resolve(portal.paths.importMetaDir, '..', '..', 'database-migrations');
  const sourceTreeFolder = isCompiled ? null : sourceDir;

  return [
    envOverride,
    sourceTreeFolder,
    portal.paths.join(args.dataDir, 'database-migrations'),
    portal.paths.resolve(portal.paths.dirname(execPath), '..', 'database-migrations'),
    embeddedFolder,
  ].filter((value): value is string => Boolean(value));
}

export async function fxResolveMigrationsFolder(portal: TPortalMigrations, args: TArgsResolveMigrationsFolder): Promise<string> {
  const candidates = await fxBuildMigrationsFolderCandidates(portal, args);

  for (const candidate of candidates) {
    if (fxHasMigrationJournal(portal, { pathname: candidate })) {
      return candidate;
    }
  }

  throw new Error(`Database migrations folder not found. Checked: ${candidates.join(', ')}`);
}

function tableExists(sqlite: { query: (sql: string) => { get(...args: unknown[]): unknown } }, tableName: string): boolean {
  const row = sqlite.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1").get(tableName);
  return row !== null && row !== undefined;
}

export function fxReadMigrationJournalEntries(portal: TPortalMigrations, args: TArgsReadMigrationJournalEntries): TJournalEntry[] {
  const journalPath = portal.paths.join(args.migrationsFolder, 'meta', '_journal.json');
  const journal = JSON.parse(portal.fs.readFileSync(journalPath, 'utf8')) as { entries?: TJournalEntry[] };
  return journal.entries ?? [];
}

export function fxShouldBootstrapLegacyMigrationState(portal: TPortalMigrations, args: TArgsShouldBootstrapLegacyMigrationState): boolean {
  void portal;

  if (tableExists(args.sqlite, MIGRATIONS_TABLE)) {
    return false;
  }

  return legacyBootstrapTables.every((tableName) => tableExists(args.sqlite, tableName));
}

export type { TJournalEntry, TPortalMigrations, TArgsBuildMigrationsFolderCandidates, TArgsResolveMigrationsFolder };
