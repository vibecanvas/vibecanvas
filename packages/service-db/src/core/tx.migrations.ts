import type { Database } from 'bun:sqlite';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import type * as schema from '../schema';
import { fxReadMigrationJournalEntries, fxResolveMigrationsFolder, fxShouldBootstrapLegacyMigrationState, type TPortalMigrations } from './fx.migrations';

export type TDbSchema = typeof schema;
export type TTxMigrationsDb = BunSQLiteDatabase<TDbSchema>;

type TPortalRunDatabaseMigrations = TPortalMigrations & {
  migrate: (db: TTxMigrationsDb, args: { migrationsFolder: string }) => void;
  log: (message: string) => void;
};

type TArgsBootstrapLegacyMigrationState = {
  sqlite: {
    run: (sql: string, ...args: unknown[]) => unknown;
    transaction: (fn: () => void) => () => void;
  };
  migrationsFolder: string;
};

type TArgsRunDatabaseMigrations = {
  dataDir: string;
  cacheDir: string;
  db: TTxMigrationsDb;
  sqlite?: Database;
  silent?: boolean;
};

const MIGRATIONS_TABLE = '__drizzle_migrations';

export function txBootstrapLegacyMigrationState(portal: TPortalRunDatabaseMigrations, args: TArgsBootstrapLegacyMigrationState): void {
  const entries = fxReadMigrationJournalEntries(portal, { migrationsFolder: args.migrationsFolder });
  if (entries.length === 0) return;

  args.sqlite.transaction(() => {
    args.sqlite.run(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        hash text NOT NULL,
        created_at numeric
      )
    `);

    for (const entry of entries) {
      args.sqlite.run(
        `INSERT INTO ${MIGRATIONS_TABLE} (hash, created_at) VALUES (?, ?)`,
        entry.tag,
        entry.when,
      );
    }
  })();
}

export async function txRunDatabaseMigrations(portal: TPortalRunDatabaseMigrations, args: TArgsRunDatabaseMigrations): Promise<void> {
  const migrationsFolder = await fxResolveMigrationsFolder(portal, {
    dataDir: args.dataDir,
    cacheDir: args.cacheDir,
  });

  const sqlite = (args.sqlite ?? (args.db as { $client?: unknown }).$client) as {
    run: (sql: string, ...args: unknown[]) => unknown;
    query: (sql: string) => { get(...args: unknown[]): unknown };
    transaction: (fn: () => void) => () => void;
  } | undefined;

  if (sqlite && fxShouldBootstrapLegacyMigrationState(portal, { sqlite })) {
    if (!args.silent) portal.log('[DB] Legacy schema detected without drizzle journal; bootstrapping migration state');
    txBootstrapLegacyMigrationState(portal, {
      sqlite,
      migrationsFolder,
    });
  }

  if (!args.silent) portal.log(`[DB] Applying migrations from ${migrationsFolder}`);

  portal.migrate(args.db, { migrationsFolder });

  if (!args.silent) portal.log('[DB] Migrations complete');
}

export type { TPortalRunDatabaseMigrations, TArgsRunDatabaseMigrations };
