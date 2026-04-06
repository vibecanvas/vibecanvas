import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import type { ICliConfig } from '@vibecanvas/cli/config';
import type { IDbService } from '@vibecanvas/db/IDbService';
import { runCanvasDeleteCommand, printCanvasDeleteHelp } from './cmd.delete.canvas';
import { runCanvasGroupCommand, printCanvasGroupHelp } from './cmd.group.canvas';
import { runCanvasListCommand, printCanvasListHelp } from './cmd.list.canvas';
import { runCanvasMoveCommand, printCanvasMoveHelp } from './cmd.move.canvas';
import { runCanvasPatchCommand } from './cmd.patch.canvas';
import { runCanvasQueryCommand, printCanvasQueryHelp } from './cmd.query.canvas';
import { runCanvasReorderCommand, printCanvasReorderHelp } from './cmd.reorder.canvas';
import { runCanvasUngroupCommand, printCanvasUngroupHelp } from './cmd.ungroup.canvas';
import { fxDiscoverLocalCanvasServer } from '../core/fx.canvas.server-discovery';
import { fnBuildRpcLink } from '../core/fn.build-rpc-link';
import { CANVAS_SUBCOMMAND_SET } from '../core/constants';

export function printCanvasPatchHelp(): void {
  console.log(`Usage: vibecanvas canvas patch [options]

Patch explicit element/group ids with structured field updates.

Required canvas selector (choose exactly one):
  --canvas <id>             Select one canvas by exact canvas row id
  --canvas-name <query>     Select one canvas by unique case-insensitive name substring

Required target selector:
  --id <id>                 Exact element/group id to patch (repeatable)

Patch source (choose at least one):
  --patch <json>            Inline JSON patch payload
  --patch-file <path>       Read patch payload from a file
  --patch-stdin             Read patch payload from stdin

Options:
  --db <path>               Optional explicit SQLite file override for the opened db
  --json                    Emit machine-readable success/error payloads
  --help, -h                Show this help message
`)
}

export function printCanvasHelp(): void {
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

export function printCanvasCommandHelp(subcommand?: string): void {
  if (!subcommand) {
    printCanvasHelp()
    return
  }

  if (subcommand === 'list') {
    printCanvasListHelp()
    return
  }

  if (subcommand === 'query') {
    printCanvasQueryHelp()
    return
  }

  if (subcommand === 'move') {
    printCanvasMoveHelp()
    return
  }

  if (subcommand === 'patch') {
    printCanvasPatchHelp()
    return
  }

  if (subcommand === 'group') {
    printCanvasGroupHelp()
    return
  }

  if (subcommand === 'ungroup') {
    printCanvasUngroupHelp()
    return
  }

  if (subcommand === 'delete') {
    printCanvasDeleteHelp()
    return
  }

  if (subcommand === 'reorder') {
    printCanvasReorderHelp()
    return
  }

  printCanvasHelp()
}

export async function runCanvasCommand(services: { db: IDbService, automerge: IAutomergeService }, config: ICliConfig) {
  if (!config.subcommand) {
    printCanvasHelp()
    return
  }

  if (!CANVAS_SUBCOMMAND_SET.has(config.subcommand)) {
    console.error(`Unknown canvas command: ${config.subcommand}`)
    process.exitCode = 1
    return
  }

  if (config.helpRequested) {
    printCanvasCommandHelp(config.subcommand)
    return
  }

  const shouldUseSafeClient = !config.rawArgv.includes('--db')
  const serverHealth = shouldUseSafeClient ? await fxDiscoverLocalCanvasServer({ bun: Bun }, { config }) : null
  const safeClient = serverHealth ? fnBuildRpcLink(serverHealth) : null

  if (config.subcommand === 'list') {
    await runCanvasListCommand({ ...services, safeClient }, { ...config })
    return
  }

  if (config.subcommand === 'query') {
    await runCanvasQueryCommand({ ...services, safeClient }, { ...config })
    return
  }

  if (config.subcommand === 'move') {
    await runCanvasMoveCommand({ ...services, safeClient }, { ...config })
    return
  }

  if (config.subcommand === 'patch') {
    await runCanvasPatchCommand({ ...services, safeClient }, { ...config })
    return
  }

  if (config.subcommand === 'group') {
    await runCanvasGroupCommand({ ...services, safeClient }, { ...config })
    return
  }

  if (config.subcommand === 'ungroup') {
    await runCanvasUngroupCommand({ ...services, safeClient }, { ...config })
    return
  }

  if (config.subcommand === 'delete') {
    await runCanvasDeleteCommand({ ...services, safeClient }, { ...config })
    return
  }

  if (config.subcommand === 'reorder') {
    await runCanvasReorderCommand({ ...services, safeClient }, { ...config })
    return
  }

  console.error(`Canvas command '${config.subcommand}' is not implemented yet.`)
  process.exitCode = 1
}
