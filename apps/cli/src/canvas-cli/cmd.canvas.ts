import { parseArgs } from 'node:util';
import { executeCanvasList } from '@vibecanvas/canvas-cmds';
import { buildCliConfig } from '../build-config';
import { parseCliArgv } from '../parse-argv';

const CANVAS_SUBCOMMANDS = ['list', 'query', 'patch', 'move', 'group', 'ungroup', 'delete', 'reorder', 'render'] as const;

type TCanvasJsonError = {
  ok: false;
  command: 'canvas';
  code: string;
  message: string;
  dbPath?: string;
};

type TCanvasInventoryEntry = {
  id: string;
  name: string;
  createdAt: string;
  automergeUrl: string;
};

type TCanvasListJsonSuccess = {
  ok: true;
  command: 'canvas';
  subcommand: 'list';
  dbPath: string;
  count: number;
  canvases: TCanvasInventoryEntry[];
};

function formatCanvasInventoryEntry(entry: TCanvasInventoryEntry): string {
  return `- id=${entry.id} name=${JSON.stringify(entry.name)} createdAt=${entry.createdAt} automergeUrl=${entry.automergeUrl}`;
}

function printCanvasListText(args: { dbPath: string; canvases: TCanvasInventoryEntry[] }): never {
  if (args.canvases.length === 0) {
    console.log(`Canvas inventory: 0 canvases in ${args.dbPath}`);
    process.exit(0);
  }

  console.log(`Canvas inventory: ${args.canvases.length} canvases in ${args.dbPath}`);
  for (const canvas of args.canvases) {
    console.log(formatCanvasInventoryEntry(canvas));
  }
  process.exit(0);
}

function printCanvasListJson(result: TCanvasListJsonSuccess): never {
  console.log(JSON.stringify(result));
  process.exit(0);
}

function printCanvasListHelp(): void {
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
`);
}

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

function exitWithCanvasJsonError(error: TCanvasJsonError): never {
  console.error(JSON.stringify(error));
  process.exit(1);
}

function exitWithCanvasTextError(message: string): never {
  console.error(message);
  process.exit(1);
}

async function runCanvasList(argv: readonly string[], wantsJson: boolean): Promise<never> {
  const parsed = parseCliArgv(argv);
  const config = buildCliConfig(parsed);
  const [{ createLocalCanvasState }] = await Promise.all([
    import('../plugins/cli/canvas.local-state'),
  ]);
  const state = createLocalCanvasState(config);

  try {
    const result = await executeCanvasList(state.context);
    const payload: TCanvasListJsonSuccess = {
      ok: true,
      command: 'canvas',
      subcommand: 'list',
      dbPath: state.dbPath,
      count: result.count,
      canvases: result.canvases,
    };

    if (wantsJson) {
      printCanvasListJson(payload);
    }

    printCanvasListText({ dbPath: state.dbPath, canvases: payload.canvases });
  } finally {
    state.dispose();
  }
}

export async function runCanvas(argv: readonly string[]): Promise<never> {
  const { values, positionals } = parseArgs({
    args: argv,
    strict: false,
    allowPositionals: true,
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      json: { type: 'boolean', default: false },
      db: { type: 'string' },
    },
  });

  const subcommand = positionals[3];
  const wantsJson = Boolean(values.json);

  if (!subcommand) {
    printCanvasHelp();
    process.exit(0);
  }

  if (!CANVAS_SUBCOMMANDS.includes(subcommand as (typeof CANVAS_SUBCOMMANDS)[number])) {
    if (wantsJson) {
      exitWithCanvasJsonError({
        ok: false,
        command: 'canvas',
        code: 'CANVAS_UNKNOWN_COMMAND',
        message: `Unknown canvas command: ${subcommand}`,
      });
    }
    exitWithCanvasTextError(`Unknown canvas command: ${subcommand}`);
  }

  if (values.help) {
    if (subcommand === 'list') {
      printCanvasListHelp();
      process.exit(0);
    }

    if (subcommand === 'query') {
      const { runCanvasQuery } = await import('./cmd.query');
      await runCanvasQuery(argv);
      throw new Error('runCanvasQuery() must exit the process.');
    }

    if (subcommand === 'move') {
      const { runCanvasMove } = await import('./cmd.move');
      await runCanvasMove(argv);
      throw new Error('runCanvasMove() must exit the process.');
    }

    if (subcommand === 'patch') {
      const { runCanvasPatch } = await import('./cmd.patch');
      await runCanvasPatch(argv);
      throw new Error('runCanvasPatch() must exit the process.');
    }

    if (subcommand === 'delete') {
      const { runCanvasDelete } = await import('./cmd.delete');
      await runCanvasDelete(argv);
      throw new Error('runCanvasDelete() must exit the process.');
    }

    if (subcommand === 'reorder') {
      const { runCanvasReorder } = await import('./cmd.reorder');
      await runCanvasReorder(argv);
      throw new Error('runCanvasReorder() must exit the process.');
    }

    printCanvasHelp();
    process.exit(0);
  }

  if (subcommand === 'query') {
    const { runCanvasQuery } = await import('./cmd.query');
    await runCanvasQuery(argv);
    throw new Error('runCanvasQuery() must exit the process.');
  }

  if (subcommand === 'move') {
    const { runCanvasMove } = await import('./cmd.move');
    await runCanvasMove(argv);
    throw new Error('runCanvasMove() must exit the process.');
  }

  if (subcommand === 'patch') {
    const { runCanvasPatch } = await import('./cmd.patch');
    await runCanvasPatch(argv);
    throw new Error('runCanvasPatch() must exit the process.');
  }

  if (subcommand === 'delete') {
    const { runCanvasDelete } = await import('./cmd.delete');
    await runCanvasDelete(argv);
    throw new Error('runCanvasDelete() must exit the process.');
  }

  if (subcommand === 'reorder') {
    const { runCanvasReorder } = await import('./cmd.reorder');
    await runCanvasReorder(argv);
    throw new Error('runCanvasReorder() must exit the process.');
  }

  try {
    if (subcommand === 'list') {
      await runCanvasList(argv, wantsJson);
    }

    const parsed = parseCliArgv(argv);
    const config = buildCliConfig(parsed);
    const dbPath = config.dbPath;

    if (wantsJson) {
      exitWithCanvasJsonError({
        ok: false,
        command: 'canvas',
        code: 'CANVAS_COMMAND_NOT_IMPLEMENTED',
        message: `Canvas command '${subcommand}' is not implemented yet.`,
        dbPath,
      });
    }

    exitWithCanvasTextError(`Canvas command '${subcommand}' is not implemented yet. Resolved db: ${dbPath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (wantsJson) {
      exitWithCanvasJsonError({
        ok: false,
        command: 'canvas',
        code: 'CANVAS_BOOTSTRAP_FAILED',
        message,
      });
    }
    exitWithCanvasTextError(message);
  }
}
