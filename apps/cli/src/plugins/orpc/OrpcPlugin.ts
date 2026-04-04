import { onError } from '@orpc/server';
import { RPCHandler } from '@orpc/server/bun-ws';
import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import type { IDbService } from '@vibecanvas/db/IDbService';
import type { IEventPublisherService } from '@vibecanvas/event-publisher/IEventPublisherService';
import type { IFilesystemService } from '@vibecanvas/filesystem-service/IFilesystemService';
import type { IPtyService } from '@vibecanvas/pty-service/IPtyService';
import type { IPlugin } from '@vibecanvas/runtime';
import type { ICliConfig } from '../../config';
import type { ICliHooks } from '../../hooks';
import { baseOs } from './orpc.base';
import { router } from './router';

type TOrpcWebSocketData = {
  path: string;
  query: string;
  requestId: string;
};

function createOrpcPlugin(): IPlugin<{ automerge: IAutomergeService; db: IDbService; eventPublisher: IEventPublisherService; filesystem: IFilesystemService; pty: IPtyService }, ICliHooks, ICliConfig> {
  return {
    name: 'orpc',
    apply(ctx) {
      if (ctx.config.command !== 'serve' || ctx.config.helpRequested || ctx.config.versionRequested) {
        return;
      }

      const automerge = ctx.services.require('automerge');
      const db = ctx.services.require('db');
      const eventPublisher = ctx.services.require('eventPublisher');
      const filesystem = ctx.services.require('filesystem');
      const pty = ctx.services.require('pty');
      const handler = new RPCHandler(baseOs.router(router), {
        interceptors: [
          onError((error) => {
            console.error(error);
          }),
        ],
      });

      ctx.hooks.wsUpgrade.tap((req) => {
        const url = new URL(req.url);
        return url.pathname === '/api';
      });

      ctx.hooks.wsMessage.tap((ws, message) => {
        const socket = ws as WebSocket & { data?: TOrpcWebSocketData };
        if (socket.data?.path !== '/api') return;

        void handler.message(ws as never, message, {
          context: {
            automerge,
            db,
            eventPublisher,
            filesystem,
            pty,
            requestId: socket.data.requestId,
          },
        }).catch((error) => {
          console.error(error);
        });
      });

      ctx.hooks.wsClose.tap((ws) => {
        const socket = ws as WebSocket & { data?: TOrpcWebSocketData };
        if (socket.data?.path !== '/api') return;

        handler.close(ws as never);
      });
    },
  };
}

export { createOrpcPlugin };
export type { TOrpcWebSocketData };
