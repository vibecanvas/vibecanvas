import type { IAutomergeService } from '@vibecanvas/service-automerge/IAutomergeService';
import type { ICliConfig } from '@vibecanvas/cli/config';
import type { IDbService } from '@vibecanvas/service-db/IDbService';
import { txExecuteCanvasDelete } from '@vibecanvas/canvas-cmds/cmds/tx.cmd.delete';
import type { TSafeCanvasCmdClient } from '../core/fn.build-rpc-link';
import { fnPrintCommandError, fnPrintCommandResult } from '../core/fn.print-command-result';
import { buildCanvasDeleteInput } from './fn.canvas-subcommand-inputs';

export function printCanvasDeleteHelp(): void {
  console.log(`Usage: vibecanvas canvas delete [options]

Delete explicit element/group ids inside one selected canvas.

Required canvas selector (choose exactly one):
  --canvas <id>             Select one canvas by exact canvas row id
  --canvas-name <query>     Select one canvas by unique case-insensitive name substring

Required target selector:
  --id <id>                 Exact element/group id to delete (repeatable)

Effects mode:
  --doc-only                Mutate the persisted doc only (default)
  --with-effects-if-available
                            Also attempt live cleanup when available

Options:
  --db <path>               Optional explicit SQLite file override for the opened db
  --json                    Emit machine-readable success/error payloads
  --help, -h                Show this help message
`);
}

export async function runCanvasDeleteCommand(services: { db: IDbService, automerge: IAutomergeService, safeClient: TSafeCanvasCmdClient | null }, config: ICliConfig) {
  const wantsJson = config.subcommandOptions?.json === true;

  try {
    const input = buildCanvasDeleteInput(config.subcommandOptions);

    if (services.safeClient) {
      const [error, result] = await services.safeClient.delete(input);
      if (error) {
        fnPrintCommandError(error, wantsJson);
        return;
      }
      fnPrintCommandResult(result, wantsJson);
      return;
    }

    const result = await txExecuteCanvasDelete({ dbService: services.db, automergeService: services.automerge }, input);
    fnPrintCommandResult(result, wantsJson);
  } catch (error) {
    fnPrintCommandError(error, wantsJson);
  }
}
