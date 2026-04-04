import type { Database } from 'bun:sqlite';
import { createSqliteDb } from '@vibecanvas/db/DbServiceBunSqlite';
import type { IDbService } from '@vibecanvas/db/IDbService';
import { EventPublisherService } from '@vibecanvas/event-publisher/EventPublisherService';
import type { IEventPublisherService } from '@vibecanvas/event-publisher/IEventPublisherService';
import { createServiceRegistry } from '@vibecanvas/runtime';
import type { ICliConfig } from './config';

declare module '@vibecanvas/runtime' {
  interface IServiceMap {
    db: IDbService;
    eventPublisher: IEventPublisherService;
  }
}

function setupServices(config: ICliConfig) {
  const services = createServiceRegistry();
  let sqlite: Database | null = null;

  const eventPublisher = new EventPublisherService();
  services.provide('eventPublisher', eventPublisher);

  if (config.command === 'serve' && !config.helpRequested && !config.versionRequested) {
    const dbService = createSqliteDb({
      databasePath: config.dbPath,
      dataDir: config.dataPath,
      cacheDir: config.cachePath,
      silentMigrations: process.env.VIBECANVAS_SILENT_DB_MIGRATIONS === '1',
    });
    sqlite = dbService.sqlite;
    services.provide('db', dbService);
  }

  return { services, sqlite };
}

export { setupServices };
