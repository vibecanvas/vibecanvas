// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IServiceMap {}

export interface IServiceRegistry {
  provide<K extends keyof IServiceMap>(name: K, impl: IServiceMap[K]): void;
  get<K extends keyof IServiceMap>(name: K): IServiceMap[K] | undefined;
  require<K extends keyof IServiceMap>(name: K): IServiceMap[K];
}

export interface IConfig {
  port: number;
  cwd: string;
  dev: boolean;
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
