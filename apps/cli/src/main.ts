#!/usr/bin/env bun
import { parseArgs } from 'node:util';
import { createRuntime } from '@vibecanvas/runtime';
import type { IService, IStoppableService } from '@vibecanvas/runtime';
import { buildCliConfig } from './build-config';
import { resolveCanvasCliBootstrap } from './canvas-cli/bootstrap';
import type { ICliConfig } from './config';
import { bootCliRuntime, createCliHooks, shutdownCliRuntime } from './hooks';
import { parseCliArgv } from './parse-argv';
import { createAutomergePlugin } from './plugins/automerge/AutomergePlugin';
import { createCliPlugin } from './plugins/cli/CliPlugin';
import { createOrpcPlugin } from './plugins/orpc/OrpcPlugin';
import { createPtyPlugin } from './plugins/pty/PtyPlugin';
import { createServerPlugin } from './plugins/server/ServerPlugin';
import { setupServices } from './setup-services';
import { setupSignals } from './setup-signals';

const CANVAS_SUBCOMMAND_ALIASES = ['list', 'query', 'patch', 'move', 'group', 'ungroup', 'delete', 'reorder', 'render'] as const;

function isStoppableService(service: IService): service is IService & IStoppableService {
  return 'stop' in service && typeof service.stop === 'function';
}

function isCanvasSubcommandAlias(value: string | undefined): value is (typeof CANVAS_SUBCOMMAND_ALIASES)[number] {
  return CANVAS_SUBCOMMAND_ALIASES.includes(value as (typeof CANVAS_SUBCOMMAND_ALIASES)[number]);
}

function rewriteArgvForCanvasAlias(argv: readonly string[]): string[] {
  const subcommand = argv[2];
  if (!isCanvasSubcommandAlias(subcommand)) return [...argv];
  return [argv[0] ?? 'bun', argv[1] ?? 'vibecanvas', 'canvas', subcommand, ...argv.slice(3)];
}

function printHelp(): void {
  console.log(`vibecanvas - Run your agents in an infinite canvas

Usage:
  vibecanvas [command] [options]

Commands:
  serve     Start the vibecanvas runtime (default when no command given)
  upgrade   Check for and install updates
  canvas    Offline canvas CLI surface

Options:
  --port <number>      Port for server/runtime (default: 3000 dev, 7496 compiled)
  --db <path>          Explicit SQLite file path override
  --upgrade <version>  Upgrade to a specific version
  --version, -v        Print version and exit
  --help, -h           Show this help message

Examples:
  vibecanvas
  vibecanvas serve --port 3001
  vibecanvas serve --db ./tmp/dev.sqlite
  vibecanvas canvas --help
  vibecanvas query --help
  vibecanvas upgrade
  vibecanvas upgrade --check
  vibecanvas --version

Canvas subcommands:
  list      List canvases in the local database
  query     Run structured readonly canvas queries
  move      Move explicit element/group ids deterministically
  patch     Patch explicit element/group ids with structured field updates
  group     Group matching elements (planned)
  ungroup   Ungroup a group (planned)
  delete    Permanently delete element/group ids (cascades groups to descendants)
  reorder   Change stacking order (front/back/forward/backward)
  render    Render the persisted canvas state (planned)

Subcommand help:
  Any subcommand accepts --help for command-specific usage.
  Canvas subcommands also work as top-level aliases, so both
  'vibecanvas canvas query --help' and 'vibecanvas query --help'
  show the same command help.
`);
}

async function bootRuntime(): Promise<void> {
  const parsedArgv = parseCliArgv();
  const config = buildCliConfig(parsedArgv);
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
}

async function main(): Promise<void> {
  const argv = rewriteArgvForCanvasAlias(Bun.argv);
  const bootstrap = resolveCanvasCliBootstrap(argv);

  if (!bootstrap.ok) {
    if (bootstrap.json) {
      console.error(JSON.stringify({
        ok: false,
        command: 'canvas',
        code: bootstrap.code,
        message: bootstrap.message,
      }));
    } else {
      console.error(bootstrap.message);
    }
    process.exit(1);
  }

  const { values, positionals } = parseArgs({
    args: argv,
    strict: false,
    allowPositionals: true,
    options: {
      version: { type: 'boolean', short: 'v', default: false },
      help: { type: 'boolean', short: 'h', default: false },
      port: { type: 'string' },
      db: { type: 'string' },
      upgrade: { type: 'string' },
    },
  });

  const subcommand = positionals[2];

  if (subcommand === 'canvas') {
    const { runCanvas } = await import('./canvas-cli/cmd.canvas');
    await runCanvas(argv);
    return;
  }

  if (values.version && (subcommand === undefined || subcommand === 'serve')) {
    console.log(process.env.VIBECANVAS_VERSION ?? '0.0.0');
    process.exit(0);
  }

  if (values.help && (subcommand === undefined || subcommand === 'serve')) {
    printHelp();
    process.exit(0);
  }

  await bootRuntime();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
