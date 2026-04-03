import type { SyncHook } from './SyncHook';
import type { SyncExitHook } from './SyncExitHook';
import type { AsyncSeriesHook } from './AsyncSeriesHook';
import type { AsyncWaterfallHook } from './AsyncWaterfallHook';

// ---------------------------------------------------------------------------
// Service Registry
// ---------------------------------------------------------------------------

/**
 * Extend via declaration merging:
 * ```
 * declare module '@vibecanvas/server/plugin' {
 *   interface IServiceMap { myService: MyService }
 * }
 * ```
 */
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
  /** Sequential async — DB, repo, services init */
  boot: AsyncSeriesHook<[]>;
  /** Fires once all boot tasks complete and server is listening */
  ready: SyncHook<[]>;
  /** Sequential async, reverse plugin order */
  shutdown: AsyncSeriesHook<[]>;

  /** HTTP request middleware chain */
  httpRequest: AsyncWaterfallHook<Request>;

  /** WebSocket lifecycle */
  wsUpgrade: SyncExitHook<[Request]>;
  wsOpen: SyncHook<[WebSocket]>;
  wsMessage: SyncHook<[WebSocket, string | Buffer]>;
  wsClose: SyncHook<[WebSocket]>;

  /** Registration phases (called between boot and network start) */
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
  /** Plugin names this must run after. Suffix with ? for optional deps. */
  after?: string[];
  apply(ctx: IPluginContext): void | Promise<void>;
}
