import { parseArgs } from 'node:util';
import { CanvasCmdError, executeCanvasQuery, renderCanvasQueryText, resolveOutputMode, resolveSelectorEnvelope } from '@vibecanvas/canvas-cmds';
import { createOfflineCanvasState, createOnlineCanvasSafeClient, discoverLocalCanvasServer } from '../plugins/cli/canvas.shared';

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

export async function runCanvasQuery(argv: readonly string[]): Promise<never> {
  const { values } = parseArgs({
    args: argv,
    strict: false,
    allowPositionals: true,
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      json: { type: 'boolean', default: false },
      db: { type: 'string' },
      canvas: { type: 'string' },
      'canvas-name': { type: 'string' },
      output: { type: 'string' },
      omitdata: { type: 'boolean', default: false },
      omitstyle: { type: 'boolean', default: false },
      id: { type: 'string', multiple: true },
      kind: { type: 'string', multiple: true },
      type: { type: 'string', multiple: true },
      style: { type: 'string', multiple: true },
      group: { type: 'string' },
      subtree: { type: 'string' },
      bounds: { type: 'string' },
      'bounds-mode': { type: 'string' },
      where: { type: 'string' },
      query: { type: 'string' },
    },
  });

  const wantsJson = Boolean(values.json);
  const canvasId = typeof values.canvas === 'string' ? values.canvas : null;
  const canvasNameQuery = typeof values['canvas-name'] === 'string' ? values['canvas-name'] : null;

  if (values.help) {
    printQueryHelp();
    process.exit(0);
  }

  const outputMode = resolveOutputMode({
    output: typeof values.output === 'string' ? values.output : undefined,
    command: 'canvas.query',
    fail: (error) => exitQueryError(wantsJson, error as TQueryJsonError),
  });

  const selector = resolveSelectorEnvelope({
    values,
    canvasId,
    canvasNameQuery,
    command: 'canvas.query',
    fail: (error) => exitQueryError(wantsJson, error as TQueryJsonError),
  });

  const hasExplicitDbPath = typeof values.db === 'string';

  const discoveredServer = hasExplicitDbPath ? null : await discoverLocalCanvasServer(argv);

  if (discoveredServer) {
    const safeClient = await createOnlineCanvasSafeClient(discoveredServer.port);
    const [clientError, result] = await safeClient.api.canvas.cmd.query({
      selector,
      output: outputMode,
      omitData: Boolean(values.omitdata),
      omitStyle: Boolean(values.omitstyle),
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

  const state = await createOfflineCanvasState(argv);

  try {
    const result = await executeCanvasQuery(state.context, {
      selector,
      output: outputMode,
      omitData: Boolean(values.omitdata),
      omitStyle: Boolean(values.omitstyle),
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
  } finally {
    state.dispose();
  }
}
