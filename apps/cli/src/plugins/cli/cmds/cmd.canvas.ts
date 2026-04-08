import type { IAutomergeService } from '@vibecanvas/service-automerge/IAutomergeService';
import type { ICliConfig } from '@vibecanvas/cli/config';
import type { IDbService } from '@vibecanvas/service-db/IDbService';
import { runCanvasDeleteCommand, printCanvasDeleteHelp } from './cmd.canvas.delete';
import { runCanvasGroupCommand, printCanvasGroupHelp } from './cmd.canvas.group';
import { runCanvasListCommand, printCanvasListHelp } from './cmd.canvas.list';
import { runCanvasMoveCommand, printCanvasMoveHelp } from './cmd.canvas.move';
import { runCanvasPatchCommand } from './cmd.canvas.patch';
import { runCanvasQueryCommand, printCanvasQueryHelp } from './cmd.canvas.query';
import { runCanvasReorderCommand, printCanvasReorderHelp } from './cmd.canvas.reorder';
import { runCanvasUngroupCommand, printCanvasUngroupHelp } from './cmd.canvas.ungroup';
import { fxDiscoverLocalCanvasServer } from '../core/fx.canvas.server-discovery';
import { fnBuildRpcLink } from '../core/fn.build-rpc-link';
import { CANVAS_SUBCOMMAND_SET } from '../core/constants';
import { fnBuildUnknownCommandError, fnPrintCommandError } from '../core/fn.print-command-result';

export function printCanvasPatchHelp(): void {
  console.log(`Usage: vibecanvas canvas patch [options]

Patch explicit element/group ids with structured field updates.

Required canvas selector (choose exactly one):
  --canvas <id>             Select one canvas by exact canvas row id
  --canvas-name <query>     Select one canvas by unique case-insensitive name substring

Required target selector:
  --id <id>                 Exact element/group id to patch (repeatable)

Patch source (choose exactly one):
  --patch <json>            Inline JSON patch payload
  --patch-file <path>       Read patch payload from a file
  --patch-stdin             Read patch payload from stdin

Patch envelope:
  Element targets expect:   {"element":{...}}
  Group targets expect:     {"group":{...}}

Common examples:
  vibecanvas patch --canvas 3d3f... --id rect-1 --patch '{"element":{"x":55}}' --json
  vibecanvas patch --canvas 3d3f... --id rect-1 --patch '{"element":{"style":{"backgroundColor":"#ff0000"}}}' --json
  vibecanvas patch --canvas 3d3f... --id group-1 --patch '{"group":{"locked":true}}' --json

Options:
  --db <path>               Optional explicit SQLite file override for the opened db
  --json                    Emit machine-readable success/error payloads
  --help, -h                Show this help message

Notes:
  - top-level patch keys must be element or group.
  - use element.data / element.style for nested element updates.
  - errors include a short hint and one likely next step.
`)
}

export function printCanvasHelp(): void {
  console.log(`Usage: vibecanvas canvas <command> [options]

Offline canvas commands:
  list                                         List canvases in the local database
  query (--canvas <id> | --canvas-name <query>) [selectors]
                                                Run a structured readonly canvas query
  patch ...                                    Patch explicit element/group ids with structured field updates
  move ...                                     Move explicit element/group ids deterministically
  group ...                                    Group matching elements
  ungroup ...                                  Ungroup a group
  delete (--canvas <id> | --canvas-name <query>) --id <id>...
                                                Permanently delete elements/groups; deleting a group cascades to descendants
  reorder (--canvas <id> | --canvas-name <query>) --id <id>... --action <front|back|forward|backward>
                                                Reorder sibling zIndex for explicit element/group ids

Shared options:
  --db <path>   Optional explicit SQLite file override; otherwise falls back to configured/default storage
  --json        Emit machine-readable errors/output
  --help, -h    Show this help message

Database path precedence:
  1. --db <path>
  2. VIBECANVAS_DB
  3. VIBECANVAS_CONFIG
  4. default dev/prod storage resolution

Next steps:
  1. vibecanvas canvas list --json
  2. vibecanvas query --canvas <canvas-id> --json
  3. vibecanvas patch --canvas <canvas-id> --id <target-id> --patch '{"element":{"x":10}}' --json

Notes:
  - --db is optional; when omitted the CLI falls back to VIBECANVAS_DB, VIBECANVAS_CONFIG, then default dev/prod storage resolution.
  - --db must point to a single SQLite file.
  - Missing or duplicate --db flags fail before the CLI imports SQLite or Automerge state.
  - list never depends on a selected/default canvas; it always enumerates every canvas in the opened db.
  - Use 'vibecanvas canvas <subcommand> --help' for command-specific arguments and examples.
  - Offline canvas commands are being added incrementally.
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
    const wantsJson = config.subcommandOptions?.json === true
    fnPrintCommandError(fnBuildUnknownCommandError('canvas', config.subcommand), wantsJson)
    if (!wantsJson) printCanvasHelp()
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

}
