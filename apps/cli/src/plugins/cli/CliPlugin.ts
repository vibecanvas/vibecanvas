import type { IPlugin } from '@vibecanvas/runtime';
import type { ICliHooks } from '../../hooks';
import type { IDbService } from '@vibecanvas/db/IDbService';
import { txCmdUpgrade } from './tx.cmd.upgrade';

function printHelp(): void {
  console.log(`vibecanvas - Run your agents in an infinite canvas

Usage:
  vibecanvas [command] [options]

Commands:
  serve     Start the vibecanvas runtime (default when no command given)
  upgrade   Check for and install updates
  canvas    Offline canvas CLI surface (WIP)

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
  vibecanvas upgrade
  vibecanvas upgrade --check
  vibecanvas --version
`);
}

function createCliPlugin(): IPlugin<{ db: IDbService }, ICliHooks> {
  return {
    name: 'cli',
    apply(ctx) {
      ctx.hooks.boot.tapPromise(async () => {
        if (ctx.config.command === 'upgrade' || ctx.config.upgradeTarget !== undefined) {
          await txCmdUpgrade({ config: ctx.config });
        }
      });

      ctx.hooks.ready.tap(() => {
        if (ctx.config.versionRequested) {
          console.log(ctx.config.version);
          process.exit(0);
        }

        if (ctx.config.helpRequested) {
          printHelp();
          process.exit(0);
        }

        if (ctx.config.command === 'canvas') {
          console.log('Canvas command is WIP.');
          process.exit(0);
        }

        if (ctx.config.command === 'unknown') {
          console.error(`Unknown command: ${ctx.config.subcommand}`);
          printHelp();
          process.exit(1);
        }

        const hasDb = ctx.services.getStore().has('db');
        const db = ctx.services.require('db')
        console.log(`vibecanvas ready (serve${hasDb ? ', db service wired' : ''})`);
      });
    },
  };
}

export { createCliPlugin };
