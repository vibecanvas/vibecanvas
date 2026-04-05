import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import type { ICliConfig } from '@vibecanvas/cli/config';
import type { IDbService } from '@vibecanvas/db/IDbService';
import { runCanvasQueryCommand } from './cmd.query.canvas';
import { fxDiscoverLocalCanvasServer } from '../core/fx.canvas.server-discovery';
import { fnBuildRpcLink } from '../core/fn.build-rpc-link';
function printCanvasHelp(): void {
  console.log(`Usage: vibecanvas canvas <command> [options]

Offline canvas commands (planned):
  list                                         List canvases in the local database
  query (--canvas <id> | --canvas-name <query>) [selectors]
                                                Run a structured readonly canvas query
  patch ...                                    Patch explicit element/group ids with structured field updates
  move ...                                     Move explicit element/group ids deterministically
  group ...                                    Group matching elements
  ungroup ...                                  Ungroup a group
  delete (--canvas <id> | --canvas-name <query>) --id <id>... [--doc-only | --with-effects-if-available]
                                                Permanently delete elements/groups; deleting a group cascades to descendants
  reorder (--canvas <id> | --canvas-name <query>) --id <id>... --action <front|back|forward|backward>
                                                Reorder sibling zIndex for explicit element/group ids
  render ...                                   Render the persisted canvas state

Shared options:
  --db <path>   Optional explicit SQLite file override; otherwise falls back to configured/default storage
  --json        Emit machine-readable errors/output
  --help, -h    Show this help message

Database path precedence:
  1. --db <path>
  2. VIBECANVAS_DB
  3. VIBECANVAS_CONFIG
  4. default dev/prod storage resolution

Notes:
  - --db is optional; when omitted the CLI falls back to VIBECANVAS_DB, VIBECANVAS_CONFIG, then default dev/prod storage resolution.
  - --db must point to a single SQLite file.
  - Missing or duplicate --db flags fail before the CLI imports SQLite or Automerge state.
  - list never depends on a selected/default canvas; it always enumerates every canvas in the opened db.
  - Use 'vibecanvas canvas <subcommand> --help' for command-specific arguments and examples.
  - Offline canvas commands are being added incrementally; unimplemented commands still honor --db resolution.
`);
}

export async function runCanvasCommand(services: { db: IDbService, automerge: IAutomergeService }, config: ICliConfig) {
  const serverHealth = await fxDiscoverLocalCanvasServer({ bun: Bun }, { config })
  if (!config.subcommand) {
    printCanvasHelp()
    return
  }


  const safeClient = serverHealth ? fnBuildRpcLink(serverHealth) : null

  if (config.subcommand === 'query') {
    await runCanvasQueryCommand({ ...services, safeClient }, { ...config })
  }
}