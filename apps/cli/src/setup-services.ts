import { createSqliteDb } from '@vibecanvas/db/DbServiceBunSqlite';
import type { IDbService } from '@vibecanvas/db/IDbService';
import { createServiceRegistry } from '@vibecanvas/runtime';
import type { ICliConfig } from './config';

declare module '@vibecanvas/runtime' {
  interface IServiceMap {
    db: IDbService;
  }
}

function setupServices(config: ICliConfig) {
  const services = createServiceRegistry();

  if (config.command === 'serve' && !config.helpRequested && !config.versionRequested) {
    const dbService = createSqliteDb({
      databasePath: config.dbPath,
      dataDir: config.dataPath,
      cacheDir: config.cachePath,
      silentMigrations: process.env.VIBECANVAS_SILENT_DB_MIGRATIONS === '1',
    });
    services.provide('db', dbService);
  }

  return { services };
}

export { setupServices };
