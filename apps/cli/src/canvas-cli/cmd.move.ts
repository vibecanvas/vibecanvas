import { parseArgs } from 'node:util';
import { CanvasCmdError, executeCanvasMove, renderCanvasMoveText } from '@vibecanvas/canvas-cmds';
import { createLocalCanvasState } from './local-state';

type TMoveJsonError = {
  ok: false;
  command: 'canvas.move';
  code: string;
  message: string;
  canvasId?: string | null;
  canvasNameQuery?: string | null;
};

function printMoveHelp(): void {
  console.log(`Usage: vibecanvas canvas move [options]

Move explicit element or group ids inside one selected canvas.

Required canvas selector (choose exactly one):
  --canvas <id>             Select one canvas by exact canvas row id
  --canvas-name <query>     Select one canvas by unique case-insensitive name substring

Required target selector:
  --id <id>                 Exact element/group id to move (repeatable)

Required mode (choose exactly one):
  --relative                Treat --x/--y as translation deltas
  --absolute                Treat --x/--y as the final target position

Required coordinates:
  --x <number>              Horizontal delta or absolute x target
  --y <number>              Vertical delta or absolute y target

Options:
  --db <path>               Optional explicit SQLite file override for the opened db
  --json                    Emit machine-readable success/error payloads
  --help, -h                Show this help message

Output:
  Text mode prints the move summary and changed ids.
  JSON mode prints { ok, command, mode, input, delta, canvas, matchedCount, matchedIds, changedCount, changedIds }.

Notes:
  - repeated --id values move many targets while preserving relative positions.
  - group ids move their descendant elements; groups themselves do not store x/y positions.
  - overlapping targets are normalized so each changed element moves at most once.
  - --absolute currently requires exactly one target id.
`);
}

function exitWithMoveJsonError(error: TMoveJsonError): never {
  console.error(JSON.stringify(error));
  process.exit(1);
}

function exitWithMoveTextError(message: string): never {
  console.error(message);
  process.exit(1);
}

function exitMoveError(wantsJson: boolean, error: TMoveJsonError): never {
  if (wantsJson) exitWithMoveJsonError(error);
  exitWithMoveTextError(error.message);
}

export async function runCanvasMove(argv: readonly string[]): Promise<never> {
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
      id: { type: 'string', multiple: true },
      relative: { type: 'boolean', default: false },
      absolute: { type: 'boolean', default: false },
      x: { type: 'string' },
      y: { type: 'string' },
    },
  });

  const wantsJson = Boolean(values.json);
  const canvasId = typeof values.canvas === 'string' ? values.canvas : null;
  const canvasNameQuery = typeof values['canvas-name'] === 'string' ? values['canvas-name'] : null;

  if (values.help) {
    printMoveHelp();
    process.exit(0);
  }

  const state = createLocalCanvasState(argv);

  try {
    const result = await executeCanvasMove(state.context, {
      canvasId,
      canvasNameQuery,
      ids: (Array.isArray(values.id) ? values.id : values.id === undefined ? [] : [values.id]).flatMap((value) => typeof value === 'string' ? value.split(',') : []),
      mode: Boolean(values.relative) ? 'relative' : 'absolute',
      x: typeof values.x === 'string' ? Number(values.x) : Number.NaN,
      y: typeof values.y === 'string' ? Number(values.y) : Number.NaN,
    });

    if (wantsJson) {
      console.log(JSON.stringify(result));
      process.exit(0);
    }

    process.stdout.write(renderCanvasMoveText(result));
    process.exit(0);
  } catch (error) {
    if (error instanceof CanvasCmdError) {
      exitMoveError(wantsJson, error.details as TMoveJsonError);
    }

    exitMoveError(wantsJson, {
      ok: false,
      command: 'canvas.move',
      code: 'CANVAS_BOOTSTRAP_FAILED',
      message: error instanceof Error ? error.message : String(error),
      canvasId,
      canvasNameQuery,
    });
  } finally {
    state.dispose();
  }
}
