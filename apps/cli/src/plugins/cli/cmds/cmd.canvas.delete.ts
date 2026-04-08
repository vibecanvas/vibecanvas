import type { IAutomergeService } from '@vibecanvas/service-automerge/IAutomergeService';
import type { ICliConfig } from '@vibecanvas/cli/config';
import type { IDbService } from '@vibecanvas/service-db/IDbService';
import { txExecuteCanvasDelete } from '@vibecanvas/canvas-cmds/cmds/tx.cmd.delete';
import { fnPrintCommandError, fnPrintCommandResult } from '../core/fn.print-command-result';
import { fxDispatchCanvasCommand } from '../core/fx.dispatch-canvas-command';
import { buildCanvasDeleteInput } from './fn.canvas-subcommand-inputs';

export function printCanvasDeleteHelp(): void {
  console.log(`Usage: vibecanvas canvas delete [options]

Delete explicit element/group ids inside one selected canvas.

Required canvas selector (choose exactly one):
  --canvas <id>             Select one canvas by exact canvas row id
  --canvas-name <query>     Select one canvas by unique case-insensitive name substring

Required target selector:
  --id <id>                 Exact element/group id to delete (repeatable)

Options:
  --db <path>               Optional explicit SQLite file override for the opened db
  --json                    Emit machine-readable success/error payloads
  --help, -h                Show this help message
`);
}

export async function runCanvasDeleteCommand(services: { db: IDbService, automerge: IAutomergeService }, config: ICliConfig) {
  const wantsJson = config.subcommandOptions?.json === true;

  try {
    const input = buildCanvasDeleteInput(config.subcommandOptions);

    const result = await fxDispatchCanvasCommand(services, config, {
      client: async (safeClient) => {
        const [error, response] = await safeClient.delete(input);
        if (error) throw error;
        return response;
      },
      local: async () => txExecuteCanvasDelete({ dbService: services.db, automergeService: services.automerge }, input),
    });
    fnPrintCommandResult(result, wantsJson);
  } catch (error) {
    fnPrintCommandError(error, wantsJson);
  }
}
