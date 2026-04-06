import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import type { ICliConfig } from '@vibecanvas/cli/config';
import type { IDbService } from '@vibecanvas/db/IDbService';
import type { TSafeCanvasCmdClient } from '../core/fn.build-rpc-link';
import { fnPrintCommandError, fnPrintCommandResult } from '../core/fn.print-command-result';
import { fxExecuteCanvasQuery, type TCanvasQuerySuccess } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.query';
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

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function printCanvasQueryText(result: TCanvasQuerySuccess): void {
  const targetLabel = result.count === 1 ? 'target' : 'targets';
  process.stdout.write(`Query matched ${result.count} ${targetLabel} in canvas=${result.canvas.id} name=${JSON.stringify(result.canvas.name)} mode=${result.mode}\n`);

  for (const match of result.matches) {
    const typeLabel = match.metadata.type === null ? 'group' : match.metadata.type;
    const bounds = match.metadata.bounds;
    const boundsLabel = bounds ? `(${bounds.x}, ${bounds.y}, ${bounds.w}, ${bounds.h})` : 'null';
    process.stdout.write(`- ${match.metadata.kind} ${match.metadata.id} [${typeLabel}] parent=${match.metadata.parentGroupId ?? 'null'} bounds=${boundsLabel} z=${match.metadata.zIndex} locked=${match.metadata.locked}\n`);
    if (Object.prototype.hasOwnProperty.call(match.payload, 'data')) {
      process.stdout.write(`  data=${stableStringify((match.payload as Record<string, unknown>).data)}\n`);
    }
    if (Object.prototype.hasOwnProperty.call(match.payload, 'style')) {
      process.stdout.write(`  style=${stableStringify((match.payload as Record<string, unknown>).style)}\n`);
    }
  }

  process.exitCode = 0;
}

export async function runCanvasQueryCommand(services: { db: IDbService, automerge: IAutomergeService, safeClient: TSafeCanvasCmdClient | null }, config: ICliConfig) {
  const wantsJson = config.subcommandOptions?.json === true;

  try {
    const input = buildCanvasQueryInput(config.subcommandOptions);

    if (services.safeClient) {
      const [error, result] = await services.safeClient.query(input);
      if (error) {
        fnPrintCommandError(error, wantsJson);
        return;
      }
      if (wantsJson) {
        fnPrintCommandResult(result, true);
        return;
      }
      printCanvasQueryText(result as TCanvasQuerySuccess);
      return;
    }

    const result = await fxExecuteCanvasQuery({ dbService: services.db, automergeService: services.automerge }, input);
    if (wantsJson) {
      fnPrintCommandResult(result, true);
      return;
    }
    printCanvasQueryText(result);
  } catch (error) {
    fnPrintCommandError(error, wantsJson);
  }
}
