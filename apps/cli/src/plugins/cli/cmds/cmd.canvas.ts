import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import type { ICliConfig } from '@vibecanvas/cli/config';
import type { IDbService } from '@vibecanvas/db/IDbService';
// import { runCanvasQuery } from '../canvas/cmd.query';
import { fxDiscoverLocalCanvasServer } from '../core/fx.canvas.server-discovery';
import { RPCLink } from '@orpc/client/fetch'
import type { RouterClient } from '@orpc/server'
import { createORPCClient, createSafeClient, type SafeClient } from '@orpc/client'
import type { canvasCmdApiContract, canvasCmdContract } from '@vibecanvas/api-canvas-cmd/contract';
import type { ContractRouterClient } from '@orpc/contract';
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
  console.log(serverHealth)
  if (!config.subcommand) {
    printCanvasHelp()
    return
  }

  const link = new RPCLink({
    url: `http://localhost:${serverHealth?.port}/rpc`,
  })
  type TCanvasCmdClient = ContractRouterClient<typeof canvasCmdApiContract>;
  type TSafeCanvasCmdClient = SafeClient<TCanvasCmdClient>;

  const client: TCanvasCmdClient = createORPCClient(link);
  const safeClient: TSafeCanvasCmdClient = createSafeClient(client);


  if (config.subcommand === 'query') {
    const result = await safeClient.query({
      selector: {
        canvasId: null,
        canvasNameQuery: 'ok',
        filters: { bounds: null, boundsMode: 'contains', group: null, ids: [], kinds: [], style: {}, subtree: null, types: [] },
        source: 'none'
      }
    })
    console.log('hello', link, result)
    // await runCanvasQuery(services, { ...config, localServerPort: serverHealth?.port ?? null })
  }
}