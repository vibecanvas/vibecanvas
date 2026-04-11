import type { IPlugin } from '@vibecanvas/runtime';
import type { IDbService } from '@vibecanvas/service-db/IDbService';
import type { IFilesystemService } from '@vibecanvas/service-filesystem/IFilesystemService';
import type { ICliConfig } from '../../config';
import type { ICliHooks } from '../../hooks';
import { txEnsureLocalFilesystemRow } from './tx.ensure-local-filesystem-row';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { join } from 'node:path';


function createFilesystemPlugin(): IPlugin<{ db: IDbService; filesystem: IFilesystemService }, ICliHooks, ICliConfig> {
  return {
    name: 'filesystem',
    apply(ctx) {
      ctx.hooks.boot.tapPromise(async () => {
        if (ctx.config.helpRequested || ctx.config.versionRequested) return;

        const db = ctx.services.get('db');
        const filesystem = ctx.services.get('filesystem');
        if (!db || !filesystem) return;

        await txEnsureLocalFilesystemRow({
          db,
          filesystem,
          join,
          mkdirSync,
          readFileSync,
          writeFileSync,
          hostname,
          randomUUID: () => crypto.randomUUID(),
        }, { config: ctx.config });
      });
    },
  };
}

export { createFilesystemPlugin };
