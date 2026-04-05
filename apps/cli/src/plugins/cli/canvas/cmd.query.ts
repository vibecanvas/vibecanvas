import { CanvasCmdError, executeCanvasQuery, renderCanvasQueryText, resolveOutputMode, resolveSelectorEnvelope, type TCanvasCmdContext } from '@vibecanvas/canvas-cmds';
import { createCanvasSafeClient } from '../canvas.online-client';
import type { ICliConfig } from '@vibecanvas/cli/config';
import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import type { IDbService } from '@vibecanvas/db/IDbService';
import type { TCanvasDoc } from '@vibecanvas/shell/automerge/index';

type TQueryJsonError = {
  ok: false;
  command: 'canvas.query';
  code: string;
  message: string;
  canvasId?: string | null;
  canvasNameQuery?: string | null;
};

function printQueryHelp(): void {
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
`);
}

function exitWithQueryJsonError(error: TQueryJsonError): never {
  console.error(JSON.stringify(error));
  process.exit(1);
}

function exitWithQueryTextError(message: string): never {
  console.error(message);
  process.exit(1);
}

function exitQueryError(wantsJson: boolean, error: TQueryJsonError): never {
  if (wantsJson) exitWithQueryJsonError(error);
  exitWithQueryTextError(error.message);
}

export async function runCanvasQuery(services: { db: IDbService, automerge: IAutomergeService }, config: ICliConfig & { localServerPort: number | null }): Promise<never> {
  if (config.helpRequested) {
    printQueryHelp();
    process.exit(0);
  }

  if (config.command !== 'canvas' || config.subcommand !== 'query') {
    exitQueryError(Boolean(config.subcommandOptions?.json), {
      ok: false,
      command: 'canvas.query',
      code: 'CANVAS_QUERY_CONFIG_INVALID',
      message: `runCanvasQuery() received unexpected command routing: command='${config.command}' subcommand='${config.subcommand ?? 'undefined'}'.`,
    });
  }

  const options = config.subcommandOptions ?? {};
  const wantsJson = Boolean(options.json);
  const canvasId = options.canvasId ?? null;
  const canvasNameQuery = options.canvasNameQuery ?? null;
  const selectorValues: Record<string, unknown> = {
    id: options.ids ?? [],
    kind: options.kinds ?? [],
    type: options.types ?? [],
    style: options.styles ?? [],
    group: options.groupId,
    subtree: options.subtree,
    bounds: options.bounds,
    'bounds-mode': options.boundsMode,
    where: options.where,
    query: options.queryJson,
  };

  const outputMode = resolveOutputMode({
    output: options.output,
    command: 'canvas.query',
    fail: (error) => exitQueryError(wantsJson, error as TQueryJsonError),
  });

  const selector = resolveSelectorEnvelope({
    values: selectorValues,
    canvasId,
    canvasNameQuery,
    command: 'canvas.query',
    fail: (error) => exitQueryError(wantsJson, error as TQueryJsonError),
  });

  if (config.localServerPort !== null) {
    const safeClient = createCanvasSafeClient(config.localServerPort);
    const [clientError, result] = await safeClient.api.canvasCmd.query({
      selector,
      output: outputMode,
      omitData: Boolean(options.omitData),
      omitStyle: Boolean(options.omitStyle),
    });

    if (clientError || !result) {
      const message = clientError instanceof Error ? clientError.message : String(clientError ?? 'canvas query failed');
      exitQueryError(wantsJson, {
        ok: false,
        command: 'canvas.query',
        code: 'CANVAS_QUERY_FAILED',
        message,
        canvasId,
        canvasNameQuery,
      });
    }

    if (wantsJson) {
      console.log(JSON.stringify(result));
      process.exit(0);
    }

    process.stdout.write(renderCanvasQueryText(result));
    process.exit(0);
  }

  const context: TCanvasCmdContext = {
    async listCanvasRows() {
      return services.db.listCanvas();
    },
    async loadCanvasHandle(row) {
      const handle = await services.automerge.repo.find<TCanvasDoc>(row.automerge_url as never);
      await handle.whenReady();
      return {
        handle,
        source: 'live',
      };
    },
    async waitForMutation(args) {
      const startedAt = Date.now();
      let lastError: unknown = null;

      while (Date.now() - startedAt < (args.source === 'live' ? 4000 : 2000)) {
        try {
          const doc = args.handle.doc();
          if (!doc) throw new Error(`Canvas doc '${args.automergeUrl}' is unavailable.`);
          if (args.predicate(doc)) return structuredClone(doc);
        } catch (error) {
          lastError = error;
        }

        await Bun.sleep(25);
      }

      throw new Error(`Timed out waiting for canvas doc '${args.automergeUrl}': ${String(lastError)}`);
    },
  };

  try {
    const result = await executeCanvasQuery(context, {
      selector,
      output: outputMode,
      omitData: Boolean(options.omitData),
      omitStyle: Boolean(options.omitStyle),
    });

    if (wantsJson) {
      console.log(JSON.stringify(result));
      process.exit(0);
    }

    process.stdout.write(renderCanvasQueryText(result));
    process.exit(0);
  } catch (error) {
    if (error instanceof CanvasCmdError) {
      exitQueryError(wantsJson, error.details as TQueryJsonError);
    }

    exitQueryError(wantsJson, {
      ok: false,
      command: 'canvas.query',
      code: 'CANVAS_BOOTSTRAP_FAILED',
      message: error instanceof Error ? error.message : String(error),
      canvasId,
      canvasNameQuery,
    });
  }
}
