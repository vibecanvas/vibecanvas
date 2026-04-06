import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import type { ICliConfig } from '@vibecanvas/cli/config';
import type { IDbService } from '@vibecanvas/db/IDbService';
import type { TSafeCanvasCmdClient } from '../core/fn.build-rpc-link';
import { fnPrintCommandError, fnPrintCommandResult } from '../core/fn.print-command-result';
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

export async function runCanvasUngroupCommand(services: { db: IDbService, automerge: IAutomergeService, safeClient: TSafeCanvasCmdClient | null }, config: ICliConfig) {
  const input = buildCanvasUngroupInput(config.subcommandOptions)
  const wantsJson = config.subcommandOptions?.json === true

  if (services.safeClient) {
    const [error, result] = await services.safeClient.ungroup(input);
    if (error) {
      fnPrintCommandError(error, wantsJson)
    }
    fnPrintCommandResult(result, wantsJson)
  }

  const result = await txExecuteCanvasUngroup({ dbService: services.db, automergeService: services.automerge }, input);
  fnPrintCommandResult(result, wantsJson)
}
