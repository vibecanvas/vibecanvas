#!/usr/bin/env bun
import { parseArgs } from 'node:util';
import { createRuntime } from '@vibecanvas/runtime';
import type { IService, IStoppableService } from '@vibecanvas/runtime';
import { buildCliConfig } from './build-config';
import { resolveCanvasCliBootstrap } from './plugins/cli/bootstrap';
import type { ICliConfig } from './config';
import { bootCliRuntime, createCliHooks, shutdownCliRuntime } from './hooks';
import { parseCliArgv } from './parse-argv';
import { createAutomergePlugin } from './plugins/automerge/AutomergePlugin';
import { createCliPlugin, printHelp } from './plugins/cli/CliPlugin';
import { printCanvasCommandHelp } from './plugins/cli/cmds/cmd.canvas';
import { createOrpcPlugin } from './plugins/orpc/OrpcPlugin';
import { createPtyPlugin } from './plugins/pty/PtyPlugin';
import { createServerPlugin } from './plugins/server/ServerPlugin';
import { setupServices } from './setup-services';
import { setupSignals } from './setup-signals';

function isStoppableService(service: IService): service is IService & IStoppableService {
  return 'stop' in service && typeof service.stop === 'function';
}



const parsedArgv = parseCliArgv();
const config = buildCliConfig(parsedArgv);

if (config.versionRequested) {
  console.log(config.version)
  process.exit(0)
}

if (config.helpRequested) {
  if (config.command === 'canvas') {
    printCanvasCommandHelp(config.subcommand)
    process.exit(0)
  }

  printHelp()
  process.exit(0)
}

const { services } = setupServices(config);

const runtime = createRuntime<any, ICliConfig>({
  plugins: [createCliPlugin(), createOrpcPlugin(), createPtyPlugin(), createAutomergePlugin(), createServerPlugin()],
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
