// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IServiceMap { }

export interface IService {
  readonly name: string;
}

export interface IStartableService {
  start(): void | Promise<void>;
}

export interface IStoppableService {
  stop(): void | Promise<void>;
}

export interface IManagedService extends IService, IStartableService, IStoppableService { }

export interface IEventSource<TEvent = unknown> {
  subscribe(listener: (event: TEvent) => void): () => void;
}

export interface IServiceRegistry {
  getStore(): Map<string, IService>;
  provide<K extends keyof IServiceMap>(name: K, impl: IServiceMap[K]): void;
  get<K extends keyof IServiceMap>(name: K): IServiceMap[K] | undefined;
  require<K extends keyof IServiceMap>(name: K): IServiceMap[K];
}

export interface IConfig {
  cwd: string;
  dev: boolean;
  compiled: boolean;
  version: string;
  command: 'serve' | 'canvas' | 'upgrade' | 'unknown';
  subcommand?: string;
  rawArgv: string[];
  argv: string[];
  port?: number;
  dbPath?: string;
  helpRequested?: boolean;
  versionRequested?: boolean;
  upgradeTarget?: string;
}

export interface IPluginContext<
  TRequiredServices extends Partial<IServiceMap> = IServiceMap,
  THooks extends object = object,
> {
  hooks: THooks;
  services: Omit<IServiceRegistry, 'get' | 'require'> & {
    get<K extends keyof TRequiredServices>(name: K): TRequiredServices[K] | undefined;
    require<K extends keyof TRequiredServices>(name: K): TRequiredServices[K];
  };
  config: IConfig;
}

export interface IPlugin<
  TRequiredServices extends Partial<IServiceMap> = {},
  THooks extends object = object,
> {
  name: string;
  after?: string[];
  apply(ctx: IPluginContext<TRequiredServices, THooks>): void | Promise<void>;
}
