import type { Database } from 'bun:sqlite';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import type { IService, IStoppableService } from '@vibecanvas/runtime';
import type * as schema from './schema';

export type TDbSchema = typeof schema;

/**
 * Drizzle remains the primary DB-facing interface used across the app.
 */
export type IDbService = BunSQLiteDatabase<TDbSchema> & IService & IStoppableService & {
  readonly sqlite: Database;
};

export interface IDbConfig {
  databasePath: string;
  dataDir: string;
  cacheDir: string;
  silentMigrations?: boolean;
}

export interface IDbHandle {
  db: IDbService;
  sqlite: Database;
  stop(): void;
}

export interface IResolvedDbConfig extends IDbConfig {}
