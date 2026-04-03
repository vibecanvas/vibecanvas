import type { IConfig, IPlugin, IPluginContext, IServiceMap, IServiceRegistry } from './interface';

type TSortable = { name: string; after?: string[] };

export function topoSort<T extends TSortable>(items: T[]): T[] {
  const byName = new Map<string, T>();
  for (const item of items) {
    if (byName.has(item.name)) throw new Error(`Duplicate name: "${item.name}"`);
    byName.set(item.name, item);
  }

  const sorted: T[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(item: T) {
    if (visited.has(item.name)) return;
    if (visiting.has(item.name)) throw new Error(`Circular dependency: "${item.name}"`);

    visiting.add(item.name);
    for (const rawDep of item.after ?? []) {
      const optional = rawDep.endsWith('?');
      const depName = optional ? rawDep.slice(0, -1) : rawDep;
      const dep = byName.get(depName);

      if (!dep && !optional) throw new Error(`Missing dependency: "${depName}" required by "${item.name}"`);
      if (dep) visit(dep);
    }
    visiting.delete(item.name);
    visited.add(item.name);
    sorted.push(item);
  }

  for (const item of items) visit(item);
  return sorted;
}

export function createServiceRegistry(): IServiceRegistry {
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

export type IRuntime<THooks extends object = object> = {
  boot(): Promise<void>;
  shutdown(): Promise<void>;
  services: IServiceRegistry;
  hooks: THooks;
};

type TRuntimeOptions<THooks extends object> = {
  plugins: IPlugin<any, THooks>[];
  config: IConfig;
  hooks: THooks;
  services?: IServiceRegistry;
  boot?: (ctx: IPluginContext<IServiceMap, THooks>) => Promise<void>;
  shutdown?: (ctx: IPluginContext<IServiceMap, THooks>) => Promise<void>;
};

export function createRuntime<THooks extends object>({
  plugins,
  config,
  hooks,
  services = createServiceRegistry(),
  boot,
  shutdown,
}: TRuntimeOptions<THooks>): IRuntime<THooks> {
  const sorted = topoSort(plugins);
  const ctx: IPluginContext<IServiceMap, THooks> = { hooks, services, config };

  return {
    async boot() {
      for (const plugin of sorted) await plugin.apply(ctx);
      await boot?.(ctx);
    },
    async shutdown() {
      await shutdown?.(ctx);
    },
    services,
    hooks,
  };
}
