import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import type { ICliConfig } from '@vibecanvas/cli/config';
import type { IDbService } from '@vibecanvas/db/IDbService';
import type { TSafeCanvasCmdClient } from '../core/fn.build-rpc-link';
import { fxExecuteCanvasQuery } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.query';
import { buildCanvasQueryInput } from './fn.canvas-subcommand-inputs';

export function printCanvasQueryHelp(): void {
  console.log(`Usage: vibecanvas canvas query [options]

Query elements and groups inside one selected canvas using structured selectors only.

Required canvas selector (choose exactly one):
  --canvas <id>             Select one canvas by exact canvas row id
  --canvas-name <query>     Select one canvas by unique case-insensitive name substring

Selector inputs (choose at most one style):
  Structured flags:
    --id <id>               Match exact element/group ids (repeatable)
    --kind <kind>           element | group (repeatable)
    --type <type>           Match persisted element types only (repeatable)
    --style <key=value>     Match exact persisted element style values (repeatable)
    --group <group-id>      Match direct children of one parent group
    --subtree <group-id>    Match the root group plus all nested descendants
    --bounds <x,y,w,h>      Match computed persisted bounds
    --bounds-mode <mode>    intersects | contains (default: intersects)

  --where <querystring>     Same selector fields encoded as query params
                             Example: "type=rect&style.backgroundColor=%23ff0000&subtree=group-root&bounds=0,0,500,400"

  --query <json>            JSON object with { ids, kinds, types, style, group, subtree, bounds, boundsMode }

Options:
  --output <mode>           summary | focused | full (default: summary)
  --omitdata                Exclude data subfields from query results
  --omitstyle               Exclude style subfields from query results
  --db <path>               Optional explicit SQLite file override for the opened db
  --json                    Emit machine-readable success/error payloads
  --help, -h                Show this help message

Output modes:
  summary   compact per-match metadata and summary payloads
  focused   summary fields plus child/detail fields for each match
  full      the full persisted target record plus the query envelope

Notes:
  - query is strictly readonly and never mutates the document.
  - query never performs natural-language parsing.
  - pass at most one selector input style: structured flags, --where, or --query.
  - --group matches direct children only.
  - --subtree includes the root group and all nested descendants.
  - group bounds are derived from descendant elements; empty groups do not match bounds filters.
  - when --db is omitted, query falls back to VIBECANVAS_DB, VIBECANVAS_CONFIG, then default dev/prod storage resolution.

Examples:
  vibecanvas canvas query --canvas 3d3f... --type rect --output summary
  vibecanvas canvas query --canvas-name design --where "subtree=group-root&type=text" --json
  vibecanvas canvas query --canvas 3d3f... --style backgroundColor=#ff0000 --json
  vibecanvas canvas query --canvas 3d3f... --query '{"bounds":{"x":0,"y":0,"w":800,"h":600}}' --json
`)
}

function printCommandResult(result: unknown, wantsJson: boolean): never {
  if (wantsJson) {
    process.stdout.write(`${JSON.stringify(result)}\n`)
    process.exit(0)
  }

  console.log(result)
  process.exit(0)
}

function printCommandError(error: unknown, wantsJson: boolean): never {
  if (wantsJson && typeof error !== 'string') {
    process.stderr.write(`${JSON.stringify(error)}\n`)
    process.exit(1)
  }

  console.error(error)
  process.exit(1)
}

export async function runCanvasQueryCommand(services: { db: IDbService, automerge: IAutomergeService, safeClient: TSafeCanvasCmdClient | null }, config: ICliConfig) {
  const input = buildCanvasQueryInput(config.subcommandOptions)
  const wantsJson = config.subcommandOptions?.json === true

  if (services.safeClient) {
    const [error, result] = await services.safeClient.query(input);
    if (error) {
      printCommandError(error, wantsJson)
    }
    printCommandResult(result, wantsJson)
  }

  const result = await fxExecuteCanvasQuery({ dbService: services.db, automergeService: services.automerge }, input);
  printCommandResult(result, wantsJson)
}
