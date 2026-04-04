import type { IPlugin } from '@vibecanvas/runtime';
import type { ICliConfig } from '../../config';
import type { ICliHooks } from '../../hooks';
import type { TOrpcWebSocketData } from '../orpc/OrpcPlugin';

function createServerPlugin(): IPlugin<{}, ICliHooks, ICliConfig> {
  return {
    name: 'server',
    apply(ctx) {
      let bunServer: ReturnType<typeof Bun.serve<TOrpcWebSocketData>> | null = null;

      ctx.hooks.boot.tapPromise(async () => {
        if (ctx.config.command !== 'serve') return;

        bunServer = Bun.serve<TOrpcWebSocketData>({
          port: ctx.config.port,
          fetch(req, server) {
            const url = new URL(req.url);
            const upgraded = ctx.hooks.wsUpgrade.call(req);

            if (upgraded) {
              if (server.upgrade(req, {
                data: {
                  path: url.pathname,
                  query: url.search,
                  requestId: crypto.randomUUID(),
                },
              })) {
                return;
              }

              return new Response('Upgrade failed', { status: 500 });
            }

            void ctx.hooks.httpRequest.promise(req);

            return new Response('vibecanvas server plugin WIP', {
              headers: {
                'content-type': 'text/plain; charset=utf-8',
              },
            });
          },
          websocket: {
            data: {} as TOrpcWebSocketData,
            open(ws) {
              ctx.hooks.wsOpen.call(ws as unknown as WebSocket);
            },
            message(ws, message) {
              const normalizedMessage = message instanceof ArrayBuffer
                ? Buffer.from(message)
                : Buffer.isBuffer(message) || typeof message === 'string'
                  ? message
                  : Buffer.from(message);
              ctx.hooks.wsMessage.call(ws as unknown as WebSocket, normalizedMessage);
            },
            close(ws) {
              ctx.hooks.wsClose.call(ws as unknown as WebSocket);
            },
          },
        });
      });

      ctx.hooks.ready.tap(() => {
        if (ctx.config.command !== 'serve') return;
        if (!bunServer) return;

        console.log(`Server listening on http://localhost:${bunServer.port}`);
      });

      ctx.hooks.shutdown.tapPromise(async () => {
        if (!bunServer) return;
        bunServer.stop();
        bunServer = null;
      });
    },
  };
}

export { createServerPlugin };
