import { createSqliteDb } from '@vibecanvas/db/DbServiceBunSqlite';
import type { IDbService } from '@vibecanvas/db/IDbService';
import type { IConfig } from '@vibecanvas/runtime';
import { createServiceRegistry } from '@vibecanvas/runtime';
import { resolveCliPaths } from './resolve-paths';

declare module '@vibecanvas/runtime' {
  interface IServiceMap {
    db: IDbService;
  }
}

function setupServices(config: IConfig) {
  const services = createServiceRegistry();

  if (config.command === 'serve' && !config.helpRequested && !config.versionRequested) {
    const paths = resolveCliPaths(config);
    const dbService = createSqliteDb({
      databasePath: paths.databasePath,
      dataDir: paths.dataDir,
      cacheDir: paths.cacheDir,
      silentMigrations: process.env.VIBECANVAS_SILENT_DB_MIGRATIONS === '1',
    });
    services.provide('db', dbService);
  }

  return { services };
}

export { setupServices };
