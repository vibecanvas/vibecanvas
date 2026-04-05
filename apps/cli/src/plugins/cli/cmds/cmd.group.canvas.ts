import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import type { ICliConfig } from '@vibecanvas/cli/config';
import type { IDbService } from '@vibecanvas/db/IDbService';
import type { TSafeCanvasCmdClient } from '../core/fn.build-rpc-link';
import { txExecuteCanvasGroup } from '@vibecanvas/canvas-cmds/cmds/tx.cmd.group';
import { buildCanvasGroupInput } from './fn.canvas-subcommand-inputs';

export function printCanvasGroupHelp(): void {
  console.log(`Usage: vibecanvas canvas group [options]

Group explicit element ids inside one selected canvas.

Required canvas selector (choose exactly one):
  --canvas <id>             Select one canvas by exact canvas row id
  --canvas-name <query>     Select one canvas by unique case-insensitive name substring

Required target selector:
  --id <id>                 Exact element id to group (repeatable)

Options:
  --db <path>               Optional explicit SQLite file override for the opened db
  --json                    Emit machine-readable success/error payloads
  --help, -h                Show this help message

Output:
  Text mode prints the new group id and grouped child ids.
  JSON mode prints { ok, command, canvas, matchedCount, matchedIds, group: { id, parentGroupId, childIds } }.

Notes:
  - grouping currently supports explicit element ids only.
  - all ids must share the same direct parentGroupId.
  - grouping preserves absolute element positions and only changes structure.
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

export async function runCanvasGroupCommand(services: { db: IDbService, automerge: IAutomergeService, safeClient: TSafeCanvasCmdClient | null }, config: ICliConfig) {
  const input = buildCanvasGroupInput(config.subcommandOptions)
  const wantsJson = config.subcommandOptions?.json === true

  if (services.safeClient) {
    const [error, result] = await services.safeClient.group(input);
    if (error) {
      printCommandError(error, wantsJson)
    }
    printCommandResult(result, wantsJson)
  }

  const result = await txExecuteCanvasGroup({ dbService: services.db, automergeService: services.automerge }, input);
  printCommandResult(result, wantsJson)
}
