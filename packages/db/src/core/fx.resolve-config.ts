import { existsSync, mkdirSync } from 'fs';
import { txConfigPath } from '@vibecanvas/shared-functions/vibecanvas-config/tx.config-path';
import type { IDbConfig } from '../interface';

function fxResolveConfiguredDb(): IDbConfig {
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

export { fxResolveConfiguredDb };
