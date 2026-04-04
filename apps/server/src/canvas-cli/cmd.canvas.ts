import { parseArgs } from "node:util";
import { openOfflineCanvasState } from "./offline-state";

const CANVAS_SUBCOMMANDS = ["list", "query", "patch", "move", "group", "ungroup", "delete", "reorder", "render"] as const;

type TCanvasJsonError = {
  ok: false;
  command: "canvas";
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
  command: "canvas";
  subcommand: "list";
  dbPath: string;
  count: number;
  canvases: TCanvasInventoryEntry[];
};

function toIsoString(value: Date | string | number): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") return new Date(value * 1000).toISOString();
  return new Date(value).toISOString();
}

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

async function runCanvasList(args: { wantsJson: boolean }): Promise<never> {
  process.env.VIBECANVAS_SILENT_DB_MIGRATIONS = "1";
  process.env.VIBECANVAS_SILENT_AUTOMERGE_LOGS = "1";

  const { db, dbPath } = await openOfflineCanvasState();
  const rows = db.query.canvas.findMany({
    orderBy: (canvas, { asc }) => [asc(canvas.created_at), asc(canvas.name), asc(canvas.id)],
  }).sync();

  const canvases = rows.map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: toIsoString(row.created_at),
    automergeUrl: row.automerge_url,
  } satisfies TCanvasInventoryEntry));

  if (args.wantsJson) {
    printCanvasListJson({
      ok: true,
      command: "canvas",
      subcommand: "list",
      dbPath,
      count: canvases.length,
      canvases,
    });
  }

  printCanvasListText({ dbPath, canvases });
}

function printCanvasHelp(): void {
  console.log(`Usage: vibecanvas canvas <command> [options]

Offline canvas commands (planned):
  list                                         List canvases in the local database
  query (--canvas <id> | --canvas-name <query>) [selectors]
                                                Run a structured readonly canvas query
  patch ...                                    Apply a structured mutation
  move ...                                     Move explicit element/group ids deterministically
  group ...                                    Group explicit element ids deterministically
  ungroup ...                                  Ungroup a group
  delete ...                                   Delete matching elements
  reorder ...                                  Change stacking order
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

export async function runCanvas(argv: readonly string[]): Promise<never> {
  const { values, positionals } = parseArgs({
    args: argv,
    strict: false,
    allowPositionals: true,
    options: {
      help: { type: "boolean", short: "h", default: false },
      json: { type: "boolean", default: false },
      db: { type: "string" },
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
        command: "canvas",
        code: "CANVAS_UNKNOWN_COMMAND",
        message: `Unknown canvas command: ${subcommand}`,
      });
    }
    exitWithCanvasTextError(`Unknown canvas command: ${subcommand}`);
  }

  if (values.help) {
    if (subcommand === "list") {
      printCanvasListHelp();
      process.exit(0);
    }

    if (subcommand === "query") {
      const { runCanvasQuery } = await import("./cmd.query");
      await runCanvasQuery(argv);
      throw new Error("runCanvasQuery() must exit the process.");
    }

    if (subcommand === "move") {
      const { runCanvasMove } = await import("./cmd.move");
      await runCanvasMove(argv);
      throw new Error("runCanvasMove() must exit the process.");
    }

    if (subcommand === "group") {
      const { runCanvasGroup } = await import("./cmd.group");
      await runCanvasGroup(argv);
      throw new Error("runCanvasGroup() must exit the process.");
    }

    printCanvasHelp();
    process.exit(0);
  }

  if (subcommand === "query") {
    const { runCanvasQuery } = await import("./cmd.query");
    await runCanvasQuery(argv);
    throw new Error("runCanvasQuery() must exit the process.");
  }

  if (subcommand === "move") {
    const { runCanvasMove } = await import("./cmd.move");
    await runCanvasMove(argv);
    throw new Error("runCanvasMove() must exit the process.");
  }

  if (subcommand === "group") {
    const { runCanvasGroup } = await import("./cmd.group");
    await runCanvasGroup(argv);
    throw new Error("runCanvasGroup() must exit the process.");
  }

  try {
    if (subcommand === "list") {
      await runCanvasList({ wantsJson });
    }

    process.env.VIBECANVAS_SILENT_DB_MIGRATIONS = "1";
    process.env.VIBECANVAS_SILENT_AUTOMERGE_LOGS = "1";
    const { dbPath } = await openOfflineCanvasState();
    if (wantsJson) {
      exitWithCanvasJsonError({
        ok: false,
        command: "canvas",
        code: "CANVAS_COMMAND_NOT_IMPLEMENTED",
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
        command: "canvas",
        code: "CANVAS_BOOTSTRAP_FAILED",
        message,
      });
    }
    exitWithCanvasTextError(message);
  }
}
