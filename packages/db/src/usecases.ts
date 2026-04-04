import { existsSync, mkdirSync } from 'fs';
import { txConfigPath } from '@vibecanvas/core/vibecanvas-config/tx.config-path';
import type { IDbHandle, IResolvedDbConfig } from './interface';
import { createSqliteDb } from './sqlite';

export function resolveConfiguredDb(): IResolvedDbConfig {
  const [config, configError] = txConfigPath({ fs: { existsSync, mkdirSync } });
  if (configError || !config) {
    console.error(configError);
    process.exit(1);
  }

  return {
    databasePath: config.databasePath,
    dataDir: config.paths.dataDir,
    cacheDir: config.paths.cacheDir,
    silentMigrations: process.env.VIBECANVAS_SILENT_DB_MIGRATIONS === '1',
  };
}

export function openConfiguredDb(): IDbHandle {
  return createSqliteDb(resolveConfiguredDb());
}
