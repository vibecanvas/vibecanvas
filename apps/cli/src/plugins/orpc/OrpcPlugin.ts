import { onError } from '@orpc/server';
import { RPCHandler } from '@orpc/server/bun-ws';
import type { IDbService } from '@vibecanvas/db/IDbService';
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

function createOrpcPlugin(): IPlugin<{ db: IDbService }, ICliHooks, ICliConfig> {
  return {
    name: 'orpc',
    apply(ctx) {
      const db = ctx.services.require('db');
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
            db,
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
