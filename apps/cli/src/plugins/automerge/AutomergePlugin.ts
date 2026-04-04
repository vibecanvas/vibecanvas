import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import type { WebSocketWithIsAlive } from '@vibecanvas/automerge-service/adapters/websocket.adapter';
import type { IPlugin } from '@vibecanvas/runtime';
import type { ICliConfig } from '../../config';
import type { ICliHooks } from '../../hooks';

type TAutomergeWebSocketData = {
  path: string;
  query: string;
  requestId: string;
};

type TBunAutomergeSocket = WebSocket & {
  data?: TAutomergeWebSocketData;
  ping(): void;
  terminate(): void;
};

function createAutomergePlugin(): IPlugin<{ automerge: IAutomergeService }, ICliHooks, ICliConfig> {
  return {
    name: 'automerge',
    apply(ctx) {
      if (ctx.config.command !== 'serve' || ctx.config.helpRequested || ctx.config.versionRequested) {
        return;
      }

      const instance = ctx.services.require('automerge');
      const automergeConnections = new Map<unknown, WebSocketWithIsAlive>();

      ctx.hooks.wsUpgrade.tap((req) => {
        const url = new URL(req.url);
        return url.pathname === '/automerge';
      });

      ctx.hooks.wsOpen.tap((ws) => {
        const socket = ws as unknown as TBunAutomergeSocket;
        if (socket.data?.path !== '/automerge') return;
        if (!instance) return;

        const wrapper: WebSocketWithIsAlive = {
          data: { isAlive: true },
          get readyState() {
            return socket.readyState;
          },
          ping() {
            socket.ping();
          },
          close() {
            socket.close();
          },
          send(data: ArrayBuffer) {
            socket.send(data);
          },
          terminate() {
            socket.terminate();
          },
        };

        automergeConnections.set(ws, wrapper);
        instance.wsAdapter.open(wrapper);
      });

      ctx.hooks.wsMessage.tap((ws, message) => {
        const socket = ws as unknown as TBunAutomergeSocket;
        if (socket.data?.path !== '/automerge') return;
        if (!instance) return;

        let bufferMessage: Buffer;
        if (typeof message === 'string') {
          try {
            const textEncoder = new TextEncoder();
            bufferMessage = Buffer.from(textEncoder.encode(message));
          } catch (err) {
            console.error('[WS:automerge] Failed to convert string to Buffer:', err);
            return;
          }
        } else {
          bufferMessage = message as Buffer;
        }

        const wrapper = automergeConnections.get(ws);
        if (!wrapper) return;
        wrapper.data.isAlive = true;

        try {
          instance.wsAdapter.message(wrapper, bufferMessage);
        } catch (err) {
          console.error('[WS:automerge] adapter.message() error:', err);
        }
      });

      ctx.hooks.wsClose.tap((ws) => {
        const socket = ws as unknown as TBunAutomergeSocket;
        if (socket.data?.path !== '/automerge') return;
        if (!instance) return;

        const wrapper = automergeConnections.get(ws);
        if (!wrapper) return;
        instance.wsAdapter.close(wrapper, 1000, '');
        automergeConnections.delete(ws);
      });

      ctx.hooks.wsPong.tap((ws, data) => {
        const socket = ws as unknown as TBunAutomergeSocket;
        if (socket.data?.path !== '/automerge') return;
        if (!instance) return;

        const wrapper = automergeConnections.get(ws);
        if (!wrapper) return;
        instance.wsAdapter.pong(wrapper, data);
      });

      ctx.hooks.shutdown.tapPromise(async () => {
        automergeConnections.clear();
      });
    },
  };
}

export { createAutomergePlugin };
