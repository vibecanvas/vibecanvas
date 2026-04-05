import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import type { ICliConfig } from '@vibecanvas/cli/config';
import type { IDbService } from '@vibecanvas/db/IDbService';
import type { TSafeCanvasCmdClient } from '../core/fn.build-rpc-link';
import { txExecuteCanvasMove } from '@vibecanvas/canvas-cmds/cmds/tx.cmd.move';
import { buildCanvasMoveInput } from './fn.canvas-subcommand-inputs';

export function printCanvasMoveHelp(): void {
  console.log(`Usage: vibecanvas canvas move [options]

Move explicit element or group ids inside one selected canvas.

Required canvas selector (choose exactly one):
  --canvas <id>             Select one canvas by exact canvas row id
  --canvas-name <query>     Select one canvas by unique case-insensitive name substring

Required target selector:
  --id <id>                 Exact element/group id to move (repeatable)

Required mode (choose exactly one):
  --relative                Treat --x/--y as translation deltas
  --absolute                Treat --x/--y as the final target position

Required coordinates:
  --x <number>              Horizontal delta or absolute x target
  --y <number>              Vertical delta or absolute y target

Options:
  --db <path>               Optional explicit SQLite file override for the opened db
  --json                    Emit machine-readable success/error payloads
  --help, -h                Show this help message

Output:
  Text mode prints the move summary and changed ids.
  JSON mode prints { ok, command, mode, input, delta, canvas, matchedCount, matchedIds, changedCount, changedIds }.

Notes:
  - repeated --id values move many targets while preserving relative positions.
  - group ids move their descendant elements; groups themselves do not store x/y positions.
  - overlapping targets are normalized so each changed element moves at most once.
  - --absolute currently requires exactly one target id.
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

export async function runCanvasMoveCommand(services: { db: IDbService, automerge: IAutomergeService, safeClient: TSafeCanvasCmdClient | null }, config: ICliConfig) {
  const input = buildCanvasMoveInput(config.subcommandOptions)
  const wantsJson = config.subcommandOptions?.json === true

  if (services.safeClient) {
    const [error, result] = await services.safeClient.move(input);
    if (error) {
      printCommandError(error, wantsJson)
    }
    printCommandResult(result, wantsJson)
  }

  const result = await txExecuteCanvasMove({ dbService: services.db, automergeService: services.automerge }, input);
  printCommandResult(result, wantsJson)
}
