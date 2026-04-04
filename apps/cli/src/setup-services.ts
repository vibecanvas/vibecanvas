import { createConfiguredSqliteDb } from '@vibecanvas/db/DbServiceBunSqlite';
import type { IDbService } from '@vibecanvas/db/IDbService';
import { createServiceRegistry } from '@vibecanvas/runtime';

declare module '@vibecanvas/runtime' {
  interface IServiceMap {
    db: IDbService;
  }
}

function setupServices() {
  const dbService = createConfiguredSqliteDb();
  const services = createServiceRegistry();

  services.provide('db', dbService);

  return {
    dbService,
    services,
  };
}

export { setupServices };
