import { canvasContract } from '@vibecanvas/api-canvas/contract';
import { canvasHandlers } from '@vibecanvas/api-canvas/handlers';
import { fileContract } from '@vibecanvas/api-file/contract';
import { fileHandlers } from '@vibecanvas/api-file/handlers';
import type { IDbService } from '@vibecanvas/db/IDbService';
import type { IPlugin } from '@vibecanvas/runtime';
import type { ICliConfig } from '../../config';
import type { ICliHooks } from '../../hooks';

type TOrpcWebSocketData = {
  path: string;
  query: string;
  requestId: string;
};

const orpcApis = {
  canvas: {
    contract: canvasContract,
    handlers: canvasHandlers,
  },
  file: {
    contract: fileContract,
    handlers: fileHandlers,
  },
};

function createOrpcPlugin(): IPlugin<{ db: IDbService }, ICliHooks, ICliConfig> {
  return {
    name: 'orpc',
    apply(ctx) {
      ctx.hooks.wsUpgrade.tap((req) => {
        const url = new URL(req.url);
        return url.pathname === '/api';
      });

      ctx.hooks.wsOpen.tap((ws) => {
        const socket = ws as WebSocket & { data?: TOrpcWebSocketData; send?: (data: string) => void };
        if (socket.data?.path !== '/api') return;
        if (typeof socket.send !== 'function') return;

        socket.send(`ORPC WIP: ${Object.keys(orpcApis).join(', ')}`);
      });

      ctx.hooks.wsMessage.tap((ws, message) => {
        const socket = ws as WebSocket & { data?: TOrpcWebSocketData };
        if (socket.data?.path !== '/api') return;

        const payload = typeof message === 'string' ? message : message.toString('utf8');
        console.log(`[ORPC WIP] requestId=${socket.data.requestId} message=${payload}`);
      });

      ctx.hooks.wsClose.tap((ws) => {
        const socket = ws as WebSocket & { data?: TOrpcWebSocketData };
        if (socket.data?.path !== '/api') return;
      });
    },
  };
}

export { createOrpcPlugin };
export type { TOrpcWebSocketData };
