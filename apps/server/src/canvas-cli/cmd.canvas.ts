import { parseArgs } from "node:util";
import { openOfflineCanvasState } from "./offline-state";

const CANVAS_SUBCOMMANDS = ["list", "inspect", "query", "patch", "move", "group", "ungroup", "delete", "reorder", "render"] as const;

type TCanvasJsonError = {
  ok: false;
  command: "canvas";
  code: string;
  message: string;
  dbPath?: string;
};

function printCanvasHelp(): void {
  console.log(`Usage: vibecanvas canvas <command> [options]

Offline canvas commands (planned):
  list       List canvases in the local database
  inspect    Inspect a canvas element by id
  query      Run a structured readonly canvas query
  patch      Apply a structured mutation
  move       Move matching elements deterministically
  group      Group matching elements
  ungroup    Ungroup a group
  delete     Delete matching elements
  reorder    Change stacking order
  render     Render the persisted canvas state

Shared options:
  --db <path>   Explicit SQLite file to open before any stateful imports
  --json        Emit machine-readable errors/output
  --help, -h    Show this help message

Database path precedence:
  1. --db <path>
  2. VIBECANVAS_DB
  3. VIBECANVAS_CONFIG
  4. default dev/prod storage resolution

Notes:
  - --db must point to a single SQLite file.
  - Missing or duplicate --db flags fail before the CLI imports SQLite or Automerge state.
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

  if (values.help || !subcommand) {
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

  try {
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
