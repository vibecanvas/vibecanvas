import type { IAutomergeService } from '@vibecanvas/service-automerge/IAutomergeService';
import type { ICliConfig } from '@vibecanvas/cli/config';
import type { IDbService } from '@vibecanvas/service-db/IDbService';
import { fnPrintCommandError, fnPrintCommandResult } from '../core/fn.print-command-result';
import { fxDispatchCanvasCommand } from '../core/fx.dispatch-canvas-command';
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

export async function runCanvasGroupCommand(services: { db: IDbService, automerge: IAutomergeService }, config: ICliConfig) {
  const wantsJson = config.subcommandOptions?.json === true;

  try {
    const input = buildCanvasGroupInput(config.subcommandOptions);

    const result = await fxDispatchCanvasCommand(services, config, {
      client: async (safeClient) => {
        const [error, response] = await safeClient.group(input);
        if (error) throw error;
        return response;
      },
      local: async () => txExecuteCanvasGroup({ dbService: services.db, automergeService: services.automerge }, input),
    });
    fnPrintCommandResult(result, wantsJson);
  } catch (error) {
    fnPrintCommandError(error, wantsJson);
  }
}
