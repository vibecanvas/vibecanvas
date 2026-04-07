#!/usr/bin/env bun
import { parseArgs } from 'node:util';
import { createRuntime } from '@vibecanvas/runtime';
import type { IService, IStoppableService } from '@vibecanvas/runtime';
import { buildCliConfig } from './build-config';
import { resolveCanvasCliBootstrap } from './plugins/cli/bootstrap';
import type { ICliConfig } from './config';
import { bootCliRuntime, createCliHooks, shutdownCliRuntime } from './hooks';
import { CliArgvError, parseCliArgv } from './parse-argv';
import { createAutomergePlugin } from './plugins/automerge/AutomergePlugin';
import { createCliPlugin, printHelp } from './plugins/cli/CliPlugin';
import { printCanvasCommandHelp, printCanvasHelp } from './plugins/cli/cmds/cmd.canvas';
import { createOrpcPlugin } from './plugins/orpc/OrpcPlugin';
import { createPtyPlugin } from './plugins/pty/PtyPlugin';
import { createServerPlugin } from './plugins/server/ServerPlugin';
import { setupServices } from './setup-services';
import { setupSignals } from './setup-signals';

function isStoppableService(service: IService): service is IService & IStoppableService {
  return 'stop' in service && typeof service.stop === 'function';
}



const rawArgv = Bun.argv
const wantsJson = rawArgv.includes('--json')

function exitArgvError(error: CliArgvError): never {
  if (wantsJson) {
    process.stderr.write(`${JSON.stringify({ ok: false, command: 'canvas', code: error.code, message: error.message })}\n`)
    process.exit(1)
  }

  console.error(error.message)
  process.exit(1)
}

let parsedArgv
let config

try {
  parsedArgv = parseCliArgv(rawArgv);
  config = buildCliConfig(parsedArgv);
} catch (error) {
  if (error instanceof CliArgvError) {
    exitArgvError(error)
  }
  throw error
}

if (config.versionRequested) {
  console.log(config.version)
  process.exit(0)
}

if (config.helpRequested) {
  if (config.command === 'canvas') {
    if (!config.subcommand) {
      printCanvasCommandHelp(config.subcommand)
      process.exit(0)
    }

    if (config.subcommand === 'list' || config.subcommand === 'query' || config.subcommand === 'move' || config.subcommand === 'patch' || config.subcommand === 'group' || config.subcommand === 'ungroup' || config.subcommand === 'delete' || config.subcommand === 'reorder') {
      printCanvasCommandHelp(config.subcommand)
      process.exit(0)
    }

    console.error(`Unknown canvas command: ${config.subcommand}`)
    printCanvasHelp()
    process.exit(1)
  }

  if (config.command === 'unknown') {
    console.error(`Unknown command: ${config.subcommand}`)
    printHelp()
    process.exit(1)
  }

  printHelp()
  process.exit(0)
}

if (config.command === 'canvas') {
  process.env.VIBECANVAS_SILENT_DB_MIGRATIONS = '1'
  process.env.VIBECANVAS_SILENT_AUTOMERGE_LOGS = '1'
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

if (config.command !== 'serve') {
  await runtime.shutdown();
  process.exit(process.exitCode ?? 0);
}
