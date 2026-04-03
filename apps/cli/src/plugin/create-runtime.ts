import { SyncHook, SyncExitHook, AsyncSeriesHook, AsyncWaterfallHook, topoSort } from '@vibecanvas/tapable';
import type { IPlugin, IPluginContext, IHooks, IServiceRegistry, IServiceMap, IConfig } from './interface';

// ---------------------------------------------------------------------------
// Service registry
// ---------------------------------------------------------------------------

function createServiceRegistry(): IServiceRegistry {
  const store = new Map<string, unknown>();

  return {
    provide<K extends keyof IServiceMap>(name: K, impl: IServiceMap[K]) {
      store.set(name as string, impl);
    },
    get<K extends keyof IServiceMap>(name: K): IServiceMap[K] | undefined {
      return store.get(name as string) as IServiceMap[K] | undefined;
    },
    require<K extends keyof IServiceMap>(name: K): IServiceMap[K] {
      const impl = store.get(name as string);
      if (impl === undefined) throw new Error(`Service "${String(name)}" not provided`);
      return impl as IServiceMap[K];
    },
  };
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function createHooks(): IHooks {
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

// ---------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------

export type IRuntime = {
  boot(): Promise<void>;
  shutdown(): Promise<void>;
  services: IServiceRegistry;
  hooks: IHooks;
};

export function createRuntime(plugins: IPlugin[], config: IConfig): IRuntime {
  const sorted = topoSort(plugins);
  const hooks = createHooks();
  const services = createServiceRegistry();
  const ctx: IPluginContext = { hooks, services, config };

  return {
    async boot() {
      for (const plugin of sorted) await plugin.apply(ctx);
      await hooks.boot.promise();
      hooks.registerRoutes.call();
      hooks.registerCommands.call();
      hooks.ready.call();
    },
    async shutdown() {
      await hooks.shutdown.promise();
    },
    services,
    hooks,
  };
}
