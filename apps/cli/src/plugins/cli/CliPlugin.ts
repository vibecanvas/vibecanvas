import type { IAutomergeService } from '@vibecanvas/service-automerge/IAutomergeService';
import type { IDbService } from '@vibecanvas/service-db/IDbService';
import type { IPlugin } from '@vibecanvas/runtime';
import type { ICliConfig } from '../../config';
import type { ICliHooks } from '../../hooks';
import { runCanvasCommand } from './cmds/cmd.canvas';
import { txCmdUpgrade } from './cmds/cmd.upgrade';

export function printHelp(): void {
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

function createCliPlugin(): IPlugin<{ db: IDbService, automerge: IAutomergeService }, ICliHooks, ICliConfig> {
  return {
    name: 'cli',
    apply(ctx) {
      ctx.hooks.boot.tapPromise(async () => {
        if (ctx.config.command === 'upgrade' || ctx.config.upgradeTarget !== undefined) {
          await txCmdUpgrade({ config: ctx.config });
        }
      });

      ctx.hooks.ready.tapPromise(async () => {
        if (ctx.config.versionRequested) {
          console.log(ctx.config.version);
          process.exitCode = 0;
          return;
        }

        if (ctx.config.command === 'canvas') {
          await runCanvasCommand({ db: ctx.services.require('db'), automerge: ctx.services.require('automerge') }, ctx.config);
          return;
        }

        if (ctx.config.helpRequested) {
          printHelp();
          process.exitCode = 0;
          return;
        }

        if (ctx.config.command === 'unknown') {
          console.error(`Unknown command: ${ctx.config.subcommand}`);
          printHelp();
          process.exitCode = 1;
        }
      });
    },
  };
}

export { createCliPlugin };
