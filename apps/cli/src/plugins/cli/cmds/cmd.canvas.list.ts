import type { IAutomergeService } from '@vibecanvas/service-automerge/IAutomergeService';
import type { ICliConfig } from '@vibecanvas/cli/config';
import type { IDbService } from '@vibecanvas/service-db/IDbService';
import { fnPrintCommandError, fnPrintCommandResult } from '../core/fn.print-command-result';
import { fxDispatchCanvasCommand } from '../core/fx.dispatch-canvas-command';
import { fxExecuteCanvasList, type TCanvasListSuccess } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.list';

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

function printCanvasListText(result: TCanvasListSuccess, dbPath: string): void {
  process.stdout.write(`Canvas inventory: ${result.count} canvases in ${dbPath}\n`);
  for (const canvas of result.canvases) {
    process.stdout.write(`- id=${canvas.id} name=${JSON.stringify(canvas.name)} createdAt=${canvas.createdAt} automergeUrl=${canvas.automergeUrl}\n`);
  }
  process.exitCode = 0;
}

export async function runCanvasListCommand(services: { db: IDbService, automerge: IAutomergeService }, config: ICliConfig) {
  const wantsJson = config.subcommandOptions?.json === true;

  try {
    const result = await fxDispatchCanvasCommand(services, config, {
      client: async (safeClient) => {
        const [error, response] = await safeClient.list();
        if (error) throw error;
        return response as TCanvasListSuccess;
      },
      local: async () => fxExecuteCanvasList({ dbService: services.db }),
    });
    if (wantsJson) {
      fnPrintCommandResult(result, true, { dbPath: config.dbPath });
      return;
    }
    printCanvasListText(result, config.dbPath);
  } catch (error) {
    fnPrintCommandError(error, wantsJson);
  }
}
