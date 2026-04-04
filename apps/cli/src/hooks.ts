import { AsyncSeriesHook, AsyncWaterfallHook, SyncExitHook, SyncHook } from '@vibecanvas/tapable';
import type { IPluginContext, IServiceMap } from '@vibecanvas/runtime';
import type { ICliConfig } from './config';

export interface ICliHooks {
  boot: AsyncSeriesHook<[]>;
  ready: SyncHook<[]>;
  shutdown: AsyncSeriesHook<[]>;

  httpRequest: AsyncWaterfallHook<Request>;

  wsUpgrade: SyncExitHook<[Request]>;
  wsOpen: SyncHook<[WebSocket]>;
  wsMessage: SyncHook<[WebSocket, string | Buffer]>;
  wsClose: SyncHook<[WebSocket]>;

  registerRoutes: SyncHook<[]>;
  registerCommands: SyncHook<[]>;
}

export function createCliHooks(): ICliHooks {
  return {
    boot: new AsyncSeriesHook<[]>(),
    ready: new SyncHook<[]>(),
    shutdown: new AsyncSeriesHook<[]>(),

    httpRequest: new AsyncWaterfallHook<Request>(),

    wsUpgrade: new SyncExitHook<[Request]>(),
    wsOpen: new SyncHook<[WebSocket]>(),
    wsMessage: new SyncHook<[WebSocket, string | Buffer]>(),
    wsClose: new SyncHook<[WebSocket]>(),

    registerRoutes: new SyncHook<[]>(),
    registerCommands: new SyncHook<[]>(),
  };
}

export async function bootCliRuntime(ctx: IPluginContext<IServiceMap, ICliHooks, ICliConfig>) {
  await ctx.hooks.boot.promise();
  ctx.hooks.registerRoutes.call();
  ctx.hooks.registerCommands.call();
  ctx.hooks.ready.call();
}

export async function shutdownCliRuntime(ctx: IPluginContext<IServiceMap, ICliHooks, ICliConfig>) {
  await ctx.hooks.shutdown.promise();
}
