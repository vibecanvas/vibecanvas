import type { IAutomergeService } from '@vibecanvas/service-automerge/IAutomergeService';
import type { ICliConfig } from '@vibecanvas/cli/config';
import type { IDbService } from '@vibecanvas/service-db/IDbService';
import type { TSafeCanvasCmdClient } from '../core/fn.build-rpc-link';
import { fnPrintCommandError, fnPrintCommandResult } from '../core/fn.print-command-result';
import { txExecuteCanvasReorder } from '@vibecanvas/canvas-cmds/cmds/tx.cmd.reorder';
import { buildCanvasReorderInput } from './fn.canvas-subcommand-inputs';

export function printCanvasReorderHelp(): void {
  console.log(`Usage: vibecanvas canvas reorder [options]

Reorder explicit element/group ids inside one selected canvas.

Required canvas selector (choose exactly one):
  --canvas <id>             Select one canvas by exact canvas row id
  --canvas-name <query>     Select one canvas by unique case-insensitive name substring

Required target selector:
  --id <id>                 Exact element/group id to reorder (repeatable)

Required action:
  --action <name>           One of: front, back, forward, backward

Options:
  --db <path>               Optional explicit SQLite file override for the opened db
  --json                    Emit machine-readable success/error payloads
  --help, -h                Show this help message

Output:
  Text mode prints the requested action and before/after sibling order.
  JSON mode prints { ok, command, action, canvas, matchedCount, matchedIds, parentGroupId, beforeOrder, afterOrder, changedIds }.

Notes:
  - all reordered ids must share the same direct parentGroupId.
  - reorder updates sibling zIndex ordering only.
  - no-op reorder requests fail clearly instead of silently succeeding.
`)
}

export async function runCanvasReorderCommand(services: { db: IDbService, automerge: IAutomergeService, safeClient: TSafeCanvasCmdClient | null }, config: ICliConfig) {
  const wantsJson = config.subcommandOptions?.json === true;

  try {
    const input = buildCanvasReorderInput(config.subcommandOptions);

    if (services.safeClient) {
      const [error, result] = await services.safeClient.reorder(input);
      if (error) {
        fnPrintCommandError(error, wantsJson);
        return;
      }
      fnPrintCommandResult(result, wantsJson);
      return;
    }

    const result = await txExecuteCanvasReorder({ dbService: services.db, automergeService: services.automerge }, input);
    fnPrintCommandResult(result, wantsJson);
  } catch (error) {
    fnPrintCommandError(error, wantsJson);
  }
}
