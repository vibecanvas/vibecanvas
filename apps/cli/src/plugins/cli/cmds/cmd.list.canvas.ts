import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import type { ICliConfig } from '@vibecanvas/cli/config';
import type { IDbService } from '@vibecanvas/db/IDbService';
import type { TSafeCanvasCmdClient } from '../core/fn.build-rpc-link';
import { fxExecuteCanvasList } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.list';

export function printCanvasListHelp(): void {
  console.log(`Usage: vibecanvas canvas list [options]

List every canvas row in the opened local database.

Options:
  --db <path>   Optional explicit SQLite file override; otherwise falls back to configured/default storage
  --json        Emit machine-readable success output
  --help, -h    Show this help message

Output:
  Text mode prints one inventory line per canvas.
  JSON mode prints { ok, command, subcommand, dbPath, count, canvases[] }.

Ordering:
  Canvases are ordered deterministically by createdAt, then name, then id.

Notes:
  - list never depends on a selected/default canvas.
  - when --db is omitted, the command falls back to VIBECANVAS_DB, VIBECANVAS_CONFIG, then default dev/prod storage resolution.
`)
}

function printCommandResult(result: unknown, wantsJson: boolean): never {
  if (wantsJson) {
    process.stdout.write(`${JSON.stringify(result)}\n`)
    process.exit(0)
  }

  console.log(result)
  process.exit(0)
}

function printCommandError(error: unknown, wantsJson: boolean): never {
  if (wantsJson && typeof error !== 'string') {
    process.stderr.write(`${JSON.stringify(error)}\n`)
    process.exit(1)
  }

  console.error(error)
  process.exit(1)
}

export async function runCanvasListCommand(services: { db: IDbService, automerge: IAutomergeService, safeClient: TSafeCanvasCmdClient | null }, config: ICliConfig) {
  const wantsJson = config.subcommandOptions?.json === true

  if (services.safeClient) {
    const [error, result] = await services.safeClient.list();
    if (error) {
      printCommandError(error, wantsJson)
    }
    printCommandResult(result, wantsJson)
  }

  const result = await fxExecuteCanvasList({ dbService: services.db });
  printCommandResult(result, wantsJson)
}
