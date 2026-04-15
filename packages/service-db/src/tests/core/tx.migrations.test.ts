import { describe, expect, test, vi } from 'vitest';
import { txBootstrapLegacyMigrationState, txRunDatabaseMigrations, type TPortalRunDatabaseMigrations } from '../../core/tx.migrations';

function createPortal(overrides?: Partial<TPortalRunDatabaseMigrations>): TPortalRunDatabaseMigrations {
  return {
    env: {
      VIBECANVAS_MIGRATIONS_DIR: undefined,
      VIBECANVAS_COMPILED: undefined,
    },
    paths: {
      dirname: (path) => path.split('/').slice(0, -1).join('/') || '/',
      join: (...parts) => parts.join('/').replace(/\/+/g, '/').replace(/\/\//g, '/'),
      resolve: (...parts) => parts.join('/').replace(/\/+/g, '/').replace(/\/\//g, '/'),
      importMetaDir: '/repo/packages/service-db/src/core',
      execPath: '/bin/vibecanvas',
    },
    fs: {
      existsSync: () => false,
      mkdirSync: () => undefined,
      readFileSync: () => JSON.stringify({ entries: [] }),
      writeFileSync: () => undefined,
    },
    loadEmbeddedMigrationsModule: async () => null,
    migrate: () => undefined,
    log: () => undefined,
    ...overrides,
  };
}

describe('tx.migrations', () => {
  test('txBootstrapLegacyMigrationState creates drizzle journal rows from entries', () => {
    const run = vi.fn();
    const transaction = vi.fn((callback: () => void) => () => callback());
    const portal = createPortal({
      fs: {
        existsSync: () => true,
        mkdirSync: () => undefined,
        readFileSync: () => JSON.stringify({
          entries: [
            { idx: 1, when: 100, tag: '001_init', breakpoints: false },
            { idx: 2, when: 200, tag: '002_more', breakpoints: false },
          ],
        }),
        writeFileSync: () => undefined,
      },
    });

    txBootstrapLegacyMigrationState(portal, {
      sqlite: { run, transaction },
      migrationsFolder: '/migrations',
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS __drizzle_migrations'));
    expect(run).toHaveBeenCalledWith(
      'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
      '001_init',
      100,
    );
    expect(run).toHaveBeenCalledWith(
      'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
      '002_more',
      200,
    );
  });

  test('txRunDatabaseMigrations bootstraps legacy state and runs migrate', async () => {
    const log = vi.fn();
    const migrate = vi.fn();
    const run = vi.fn();
    const transaction = vi.fn((callback: () => void) => () => callback());
    const portal = createPortal({
      fs: {
        existsSync: (path) => String(path) === '/data/database-migrations/meta/_journal.json',
        mkdirSync: () => undefined,
        readFileSync: () => JSON.stringify({
          entries: [{ idx: 1, when: 100, tag: '001_init', breakpoints: false }],
        }),
        writeFileSync: () => undefined,
      },
      log,
      migrate,
    });

    const sqlite = {
      run,
      transaction,
      query: () => ({
        get: (tableName: unknown) => ['automerge_repo_data', 'canvas', 'files'].includes(String(tableName)) ? { name: String(tableName) } : null,
      }),
    };

    const db = {} as never;

    await txRunDatabaseMigrations(portal, {
      dataDir: '/data',
      cacheDir: '/cache',
      db,
      sqlite,
      silent: false,
    });

    expect(log).toHaveBeenCalledWith('[DB] Legacy schema detected without drizzle journal; bootstrapping migration state');
    expect(log).toHaveBeenCalledWith('[DB] Applying migrations from /data/database-migrations');
    expect(migrate).toHaveBeenCalledWith(db, { migrationsFolder: '/data/database-migrations' });
    expect(log).toHaveBeenCalledWith('[DB] Migrations complete');
    expect(run).toHaveBeenCalledWith(
      'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
      '001_init',
      100,
    );
  });

  test('txRunDatabaseMigrations skips bootstrap logging when silent and uses db client fallback', async () => {
    const log = vi.fn();
    const migrate = vi.fn();
    const portal = createPortal({
      fs: {
        existsSync: (path) => String(path) === '/data/database-migrations/meta/_journal.json',
        mkdirSync: () => undefined,
        readFileSync: () => JSON.stringify({ entries: [] }),
        writeFileSync: () => undefined,
      },
      log,
      migrate,
    });

    const sqlite = {
      run: vi.fn(),
      transaction: vi.fn((callback: () => void) => () => callback()),
      query: () => ({
        get: () => null,
      }),
    };

    const db = { $client: sqlite } as never;

    await txRunDatabaseMigrations(portal, {
      dataDir: '/data',
      cacheDir: '/cache',
      db,
      silent: true,
    });

    expect(migrate).toHaveBeenCalledWith(db, { migrationsFolder: '/data/database-migrations' });
    expect(log).not.toHaveBeenCalled();
  });
});
