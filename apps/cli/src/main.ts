#!/usr/bin/env bun
import { createRuntime } from '@vibecanvas/runtime';
import type { IService, IStoppableService } from '@vibecanvas/runtime';
import { buildCliConfig } from './build-config';
import type { ICliConfig } from './config';
import { bootCliRuntime, createCliHooks, shutdownCliRuntime } from './hooks';
import { parseCliArgv } from './parse-argv';
import { createAutomergePlugin } from './plugins/automerge/AutomergePlugin';
import { createCliPlugin } from './plugins/cli/CliPlugin';
import { createOrpcPlugin } from './plugins/orpc/OrpcPlugin';
import { setupServices } from './setup-services';
import { setupSignals } from './setup-signals';
import { createServerPlugin } from './plugins/server/ServerPlugin';

function isStoppableService(service: IService): service is IService & IStoppableService {
  return 'stop' in service && typeof service.stop === 'function';
}

const parsedArgv = parseCliArgv();
const config = buildCliConfig(parsedArgv);
const { services, sqlite } = setupServices(config);

const runtime = createRuntime<any, ICliConfig>({
  plugins: [createCliPlugin(), createOrpcPlugin(), createAutomergePlugin(sqlite), createServerPlugin()],
  services,
  hooks: createCliHooks(),
  config,
  boot: bootCliRuntime,
  shutdown: async (ctx) => {
    await shutdownCliRuntime(ctx);
    for (const service of services.getStore().values()) {
      if (isStoppableService(service)) {
        await service.stop();
      }
    }
  },
});

setupSignals(async () => {
  await runtime.shutdown();
  process.exit(0);
});

await runtime.boot();
