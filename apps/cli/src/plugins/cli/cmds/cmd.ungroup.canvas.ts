import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import type { ICliConfig } from '@vibecanvas/cli/config';
import type { IDbService } from '@vibecanvas/db/IDbService';
import type { TSafeCanvasCmdClient } from '../core/fn.build-rpc-link';
import { txExecuteCanvasUngroup } from '@vibecanvas/canvas-cmds/cmds/tx.cmd.ungroup';
import { buildCanvasUngroupInput } from './fn.canvas-subcommand-inputs';

export function printCanvasUngroupHelp(): void {
  console.log(`Usage: vibecanvas canvas ungroup [options]

Ungroup explicit group ids inside one selected canvas.

Required canvas selector (choose exactly one):
  --canvas <id>             Select one canvas by exact canvas row id
  --canvas-name <query>     Select one canvas by unique case-insensitive name substring

Required target selector:
  --id <id>                 Exact group id to ungroup (repeatable)

Options:
  --db <path>               Optional explicit SQLite file override for the opened db
  --json                    Emit machine-readable success/error payloads
  --help, -h                Show this help message

Output:
  Text mode prints removed group ids and released child ids.
  JSON mode prints { ok, command, canvas, matchedCount, matchedIds, removedGroupCount, removedGroupIds, releasedChildCount, releasedChildIds }.

Notes:
  - ungrouping currently supports explicit group ids only.
  - ungrouping preserves absolute element positions and only changes structure.
  - direct child groups are reparented to the removed group's parent.
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

export async function runCanvasUngroupCommand(services: { db: IDbService, automerge: IAutomergeService, safeClient: TSafeCanvasCmdClient | null }, config: ICliConfig) {
  const input = buildCanvasUngroupInput(config.subcommandOptions)
  const wantsJson = config.subcommandOptions?.json === true

  if (services.safeClient) {
    const [error, result] = await services.safeClient.ungroup(input);
    if (error) {
      printCommandError(error, wantsJson)
    }
    printCommandResult(result, wantsJson)
  }

  const result = await txExecuteCanvasUngroup({ dbService: services.db, automergeService: services.automerge }, input);
  printCommandResult(result, wantsJson)
}
