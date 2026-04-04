#!/usr/bin/env bun
import { createRuntime } from '@vibecanvas/runtime';
import type { IService, IStoppableService } from '@vibecanvas/runtime';
import { buildCliConfig } from './build-config';
import { bootCliRuntime, createCliHooks, shutdownCliRuntime } from './hooks';
import { parseCliArgv } from './parse-argv';
import { setupServices } from './setup-services';
import { setupSignals } from './setup-signals';

function isStoppableService(service: IService): service is IService & IStoppableService {
  return 'stop' in service && typeof service.stop === 'function';
}

const { services } = setupServices();
const parsedArgv = parseCliArgv();
const config = buildCliConfig(parsedArgv);

const runtime = createRuntime({
  plugins: [],
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
console.log(`vibecanvas ready (${config.command}, db service wired)`);
