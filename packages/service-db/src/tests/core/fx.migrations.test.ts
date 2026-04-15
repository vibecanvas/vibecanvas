import { describe, expect, test } from 'vitest';
import {
  fxBuildMigrationsFolderCandidates,
  fxExtractEmbeddedMigrations,
  fxHasMigrationJournal,
  fxReadMigrationJournalEntries,
  fxResolveMigrationsFolder,
  fxShouldBootstrapLegacyMigrationState,
  type TPortalMigrations,
} from '../../core/fx.migrations';

function createPortal(overrides?: Partial<TPortalMigrations>): TPortalMigrations {
  const writtenFiles = new Map<string, string>();
  const existingPaths = new Set<string>();
  const readFiles = new Map<string, string>();

  const join = (...parts: string[]) => parts.join('/').replace(/\/+/g, '/').replace(/\/\//g, '/');
  const dirname = (path: string) => path.split('/').slice(0, -1).join('/') || '/';
  const resolve = (...parts: string[]) => join(...parts).replace('/./', '/');

  const portal: TPortalMigrations = {
    env: {
      VIBECANVAS_MIGRATIONS_DIR: undefined,
      VIBECANVAS_COMPILED: undefined,
    },
    paths: {
      dirname,
      join,
      resolve,
      importMetaDir: '/repo/packages/service-db/src/core',
      execPath: '/bin/vibecanvas',
    },
    fs: {
      existsSync: (path) => existingPaths.has(String(path)),
      mkdirSync: () => undefined,
      readFileSync: (path) => {
        const key = String(path);
        if (readFiles.has(key)) {
          return readFiles.get(key)!;
        }
        if (writtenFiles.has(key)) {
          return writtenFiles.get(key)!;
        }
        throw new Error(`Unexpected read: ${key}`);
      },
      writeFileSync: (path, data) => {
        writtenFiles.set(String(path), String(data));
        existingPaths.add(String(path));
      },
    },
    loadEmbeddedMigrationsModule: async () => null,
    ...overrides,
  };

  return Object.assign(portal, {
    __writtenFiles: writtenFiles,
    __existingPaths: existingPaths,
    __readFiles: readFiles,
  });
}

describe('fx.migrations', () => {
  test('fxHasMigrationJournal checks journal path existence', () => {
    const portal = createPortal() as TPortalMigrations & { __existingPaths: Set<string> };
    portal.__existingPaths.add('/tmp/migrations/meta/_journal.json');

    expect(fxHasMigrationJournal(portal, { pathname: '/tmp/migrations' })).toBe(true);
    expect(fxHasMigrationJournal(portal, { pathname: '/tmp/missing' })).toBe(false);
  });

  test('fxExtractEmbeddedMigrations skips when prod embedded module is unavailable', async () => {
    const portal = createPortal({
      loadEmbeddedMigrationsModule: async () => null,
    });

    await expect(fxExtractEmbeddedMigrations(portal, { cacheDir: '/cache' })).resolves.toBeNull();
  });

  test('fxExtractEmbeddedMigrations copies embedded assets and returns extracted folder', async () => {
    const portal = createPortal({
      loadEmbeddedMigrationsModule: async () => ({
        listEmbeddedMigrationFiles: () => ['meta/_journal.json', '0001_init.sql'],
        getEmbeddedMigrationPath: (relativePath) => `/embedded/${relativePath}`,
      }),
    }) as TPortalMigrations & {
      __existingPaths: Set<string>;
      __readFiles: Map<string, string>;
      __writtenFiles: Map<string, string>;
    };

    portal.__readFiles.set('/embedded/meta/_journal.json', JSON.stringify({ entries: [] }));
    portal.__readFiles.set('/embedded/0001_init.sql', 'create table test;');
    portal.__existingPaths.add('/cache/database-migrations-embedded/meta/_journal.json');

    await expect(fxExtractEmbeddedMigrations(portal, { cacheDir: '/cache' })).resolves.toBe('/cache/database-migrations-embedded');
    expect(portal.__writtenFiles.get('/cache/database-migrations-embedded/meta/_journal.json')).toContain('{"entries":[]}');
    expect(portal.__writtenFiles.get('/cache/database-migrations-embedded/0001_init.sql')).toBe('create table test;');
  });

  test('fxBuildMigrationsFolderCandidates includes source tree in dev and embedded when available', async () => {
    const portal = createPortal({
      env: {
        VIBECANVAS_COMPILED: 'false',
        VIBECANVAS_MIGRATIONS_DIR: '/override',
      },
      loadEmbeddedMigrationsModule: async () => ({
        listEmbeddedMigrationFiles: () => ['meta/_journal.json'],
        getEmbeddedMigrationPath: () => '/embedded/meta/_journal.json',
      }),
    }) as TPortalMigrations & {
      __existingPaths: Set<string>;
      __readFiles: Map<string, string>;
    };

    portal.__readFiles.set('/embedded/meta/_journal.json', JSON.stringify({ entries: [] }));
    portal.__existingPaths.add('/cache/database-migrations-embedded/meta/_journal.json');

    await expect(fxBuildMigrationsFolderCandidates(portal, {
      dataDir: '/data',
      cacheDir: '/cache',
    })).resolves.toEqual([
      '/override',
      '/repo/packages/service-db/src/core/../../database-migrations',
      '/data/database-migrations',
      '/bin/../database-migrations',
      '/cache/database-migrations-embedded',
    ]);
  });

  test('fxResolveMigrationsFolder returns first candidate with journal', async () => {
    const portal = createPortal() as TPortalMigrations & { __existingPaths: Set<string> };
    portal.__existingPaths.add('/data/database-migrations/meta/_journal.json');

    await expect(fxResolveMigrationsFolder(portal, {
      dataDir: '/data',
      cacheDir: '/cache',
    })).resolves.toBe('/data/database-migrations');
  });

  test('fxReadMigrationJournalEntries reads journal entries', () => {
    const portal = createPortal() as TPortalMigrations & { __readFiles: Map<string, string> };
    portal.__readFiles.set('/migrations/meta/_journal.json', JSON.stringify({
      entries: [{ idx: 1, when: 2, tag: 'a', breakpoints: false }],
    }));

    expect(fxReadMigrationJournalEntries(portal, { migrationsFolder: '/migrations' })).toEqual([
      { idx: 1, when: 2, tag: 'a', breakpoints: false },
    ]);
  });

  test('fxShouldBootstrapLegacyMigrationState requires legacy tables and missing drizzle journal', () => {
    const tables = new Set(['automerge_repo_data', 'canvas', 'files']);
    const sqlite = {
      query: () => ({
        get: (tableName: unknown) => tables.has(String(tableName)) ? { name: String(tableName) } : null,
      }),
    };

    expect(fxShouldBootstrapLegacyMigrationState(createPortal(), { sqlite })).toBe(true);
    tables.add('__drizzle_migrations');
    expect(fxShouldBootstrapLegacyMigrationState(createPortal(), { sqlite })).toBe(false);
  });
});
