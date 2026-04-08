import type { IAutomergeService } from '@vibecanvas/service-automerge/IAutomergeService';
import type { ICliConfig } from '@vibecanvas/cli/config';
import type { IDbService } from '@vibecanvas/service-db/IDbService';
import { fnPrintCommandError, fnPrintCommandResult } from '../core/fn.print-command-result';
import { fxDispatchCanvasCommand } from '../core/fx.dispatch-canvas-command';
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

export async function runCanvasUngroupCommand(services: { db: IDbService, automerge: IAutomergeService }, config: ICliConfig) {
  const wantsJson = config.subcommandOptions?.json === true;

  try {
    const input = buildCanvasUngroupInput(config.subcommandOptions);

    const result = await fxDispatchCanvasCommand(services, config, {
      client: async (safeClient) => {
        const [error, response] = await safeClient.ungroup(input);
        if (error) throw error;
        return response;
      },
      local: async () => txExecuteCanvasUngroup({ dbService: services.db, automergeService: services.automerge }, input),
    });
    fnPrintCommandResult(result, wantsJson);
  } catch (error) {
    fnPrintCommandError(error, wantsJson);
  }
}
