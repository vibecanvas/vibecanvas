import type { Database } from 'bun:sqlite';
import { AutomergeService } from '@vibecanvas/service-automerge/AutomergeServer';
import type { IAutomergeService } from '@vibecanvas/service-automerge/IAutomergeService';
import { createSqliteDb } from '@vibecanvas/service-db/DbServiceBunSqlite/index';
import type { IDbService } from '@vibecanvas/service-db/IDbService';
import { EventPublisherService } from '@vibecanvas/service-event-publisher/EventPublisherService';
import type { IEventPublisherService } from '@vibecanvas/service-event-publisher/IEventPublisherService';
import { FilesystemServiceNode } from '@vibecanvas/service-filesystem/FilesystemServiceNode';
import type { IFilesystemService } from '@vibecanvas/service-filesystem/IFilesystemService';
import { PtyServiceBunPty } from '@vibecanvas/service-pty/PtyServiceBunPty';
import type { IPtyService } from '@vibecanvas/service-pty/IPtyService';
import { createServiceRegistry } from '@vibecanvas/runtime';
import type { ICliConfig } from './config';

declare module '@vibecanvas/runtime' {
  interface IServiceMap {
    automerge: IAutomergeService;
    db: IDbService;
    eventPublisher: IEventPublisherService;
    filesystem: IFilesystemService;
    pty: IPtyService;
  }
}

function setupServices(config: ICliConfig) {
  const services = createServiceRegistry();
  let sqlite: Database | null = null;

  const eventPublisher = new EventPublisherService();
  services.provide('eventPublisher', eventPublisher);

  const dbService = createSqliteDb({
    databasePath: config.dbPath,
    dataDir: config.dataPath,
    cacheDir: config.cachePath,
    silentMigrations: process.env.VIBECANVAS_SILENT_DB_MIGRATIONS === '1',
  });
  const filesystemService = new FilesystemServiceNode(eventPublisher);
  const ptyService = new PtyServiceBunPty();

  sqlite = dbService.sqlite;
  services.provide('db', dbService);
  services.provide('filesystem', filesystemService);
  services.provide('pty', ptyService);

  const automergeService = new AutomergeService(sqlite);
  services.provide('automerge', automergeService);

  return { services, automergeService, dbService, eventPublisher, filesystemService, ptyService };
}

export { setupServices };
