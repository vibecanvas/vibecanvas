import type { Database } from 'bun:sqlite';
import { AutomergeService } from '@vibecanvas/automerge-service/AutomergeServer';
import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import { createSqliteDb } from '@vibecanvas/db/DbServiceBunSqlite/index';
import type { IDbService } from '@vibecanvas/db/IDbService';
import { EventPublisherService } from '@vibecanvas/event-publisher-service/EventPublisherService';
import type { IEventPublisherService } from '@vibecanvas/event-publisher-service/IEventPublisherService';
import { FilesystemServiceNode } from '@vibecanvas/filesystem-service/FilesystemServiceNode';
import type { IFilesystemService } from '@vibecanvas/filesystem-service/IFilesystemService';
import { PtyServiceBunPty } from '@vibecanvas/pty-service/PtyServiceBunPty';
import type { IPtyService } from '@vibecanvas/pty-service/IPtyService';
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

  return { services, sqlite, automergeService, dbService, eventPublisher, filesystemService, ptyService };
}

export { setupServices };
