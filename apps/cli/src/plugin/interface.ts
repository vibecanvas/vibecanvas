import type { SyncHook, SyncExitHook, AsyncSeriesHook, AsyncWaterfallHook } from '@vibecanvas/tapable';

// ---------------------------------------------------------------------------
// Service Registry
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IServiceMap {}

export interface IServiceRegistry {
  provide<K extends keyof IServiceMap>(name: K, impl: IServiceMap[K]): void;
  get<K extends keyof IServiceMap>(name: K): IServiceMap[K] | undefined;
  require<K extends keyof IServiceMap>(name: K): IServiceMap[K];
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface IConfig {
  port: number;
  cwd: string;
  dev: boolean;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export interface IHooks {
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

// ---------------------------------------------------------------------------
// Plugin Context & Plugin
// ---------------------------------------------------------------------------

export interface IPluginContext {
  hooks: IHooks;
  services: IServiceRegistry;
  config: IConfig;
}

export interface IPlugin {
  name: string;
  after?: string[];
  apply(ctx: IPluginContext): void | Promise<void>;
}
