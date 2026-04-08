import type { IAutomergeService } from '@vibecanvas/service-automerge/IAutomergeService';
import type { IDbService } from '@vibecanvas/service-db/IDbService';
import type { IPlugin } from '@vibecanvas/runtime';
import type { ICliConfig } from '../../config';
import type { ICliHooks } from '../../hooks';
import { runCanvasCommand, printCanvasCommandHelp, printCanvasHelp } from './cmds/cmd.canvas';
import { txCmdUpgrade } from './cmds/cmd.upgrade';
import { CANVAS_SUBCOMMAND_SET } from './core/constants';
import { fnBuildUnknownCommandError, fnPrintCommandError } from './core/fn.print-command-result';

export function printHelp(): void {
  console.log(`vibecanvas - Run your agents in an infinite canvas

Usage:
  vibecanvas [command] [options]

Commands:
  serve     Start the vibecanvas runtime (default when no command given)
  upgrade   Check for and install updates
  canvas    Canvas command surface

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
  list      List canvases in the selected database
  query     Run structured readonly canvas queries
  add       Add primitive elements to one canvas
  move      Move explicit element/group ids deterministically
  patch     Patch explicit element/group ids with structured field updates
  group     Group matching elements
  ungroup   Ungroup a group
  delete    Permanently delete element/group ids (cascades groups to descendants)
  reorder   Change stacking order (front/back/forward/backward)

Help ladder:
  1. vibecanvas --help
  2. vibecanvas canvas --help
  3. vibecanvas <subcommand> --help
  4. run the command; errors include a short hint and next step

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
        const wantsJson = ctx.config.subcommandOptions?.json === true;

        if (ctx.config.versionRequested) {
          console.log(ctx.config.version);
          process.exitCode = 0;
          return;
        }

        if (ctx.config.command === 'unknown') {
          fnPrintCommandError(fnBuildUnknownCommandError('root', ctx.config.subcommand), wantsJson);
          if (!wantsJson) printHelp();
          process.exitCode = 1;
          return;
        }

        if (ctx.config.helpRequested && ctx.config.command !== 'canvas') {
          printHelp();
          process.exitCode = 0;
          return;
        }

        if (ctx.config.command === 'canvas' && ctx.config.helpRequested) {
          if (!ctx.config.subcommand) {
            printCanvasHelp();
            process.exitCode = 0;
            return;
          }

          if (!CANVAS_SUBCOMMAND_SET.has(ctx.config.subcommand)) {
            fnPrintCommandError(fnBuildUnknownCommandError('canvas', ctx.config.subcommand), wantsJson);
            if (!wantsJson) printCanvasHelp();
            process.exitCode = 1;
            return;
          }

          printCanvasCommandHelp(ctx.config.subcommand);
          process.exitCode = 0;
          return;
        }

        if (ctx.config.command === 'canvas' && ctx.config.subcommand && !CANVAS_SUBCOMMAND_SET.has(ctx.config.subcommand)) {
          fnPrintCommandError(fnBuildUnknownCommandError('canvas', ctx.config.subcommand), wantsJson);
          if (!wantsJson) printCanvasHelp();
          process.exitCode = 1;
          return;
        }

        if (ctx.config.command === 'canvas') {
          await runCanvasCommand({ db: ctx.services.require('db'), automerge: ctx.services.require('automerge') }, ctx.config);
          return;
        }
      });
    },
  };
}

export { createCliPlugin };
