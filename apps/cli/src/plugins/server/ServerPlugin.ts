import type { IPlugin } from '@vibecanvas/runtime';
import type { ICliHooks } from '../../hooks';

function createServerPlugin(): IPlugin<{}, ICliHooks> {
  return {
    name: 'server',
    apply(ctx) {
      ctx.hooks.ready.tap(() => {
        console.log('hello');
      });
    },
  };
}

export { createServerPlugin };
