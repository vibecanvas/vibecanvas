import type { IPlugin } from '@vibecanvas/runtime';
import type { ICliConfig } from '../../config';
import type { ICliHooks } from '../../hooks';

function createServerPlugin(): IPlugin<{}, ICliHooks, ICliConfig> {
  return {
    name: 'server',
    apply(ctx) {
      let bunServer: ReturnType<typeof Bun.serve> | null = null;

      ctx.hooks.boot.tapPromise(async () => {
        if (ctx.config.command !== 'serve') return;

        const port = ctx.config.port ?? 3000;
        bunServer = Bun.serve({
          port,
          fetch() {
            return new Response('vibecanvas server plugin WIP', {
              headers: {
                'content-type': 'text/plain; charset=utf-8',
              },
            });
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
