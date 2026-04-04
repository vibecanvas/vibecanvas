import { parseArgs } from 'node:util';
import { CanvasCmdError, REORDER_ACTIONS, executeCanvasReorder, renderCanvasReorderText, type TReorderAction } from '@vibecanvas/canvas-cmds';
import { buildCliConfig } from '../../../build-config';
import { parseCliArgv } from '../../../parse-argv';
import { createLocalCanvasState } from '../canvas.local-state';

type TReorderJsonError = {
  ok: false;
  command: 'canvas.reorder';
  code: string;
  message: string;
  canvasId?: string | null;
  canvasNameQuery?: string | null;
};

function printReorderHelp(): void {
  console.log(`Usage: vibecanvas canvas reorder [options]

Reorder explicit element/group ids inside one selected canvas by updating sibling zIndex values.

Required canvas selector (choose exactly one):
  --canvas <id>             Select one canvas by exact canvas row id
  --canvas-name <query>     Select one canvas by unique case-insensitive name substring

Required target selector:
  --id <id>                 Exact element/group id to reorder (repeatable)

Required action:
  --action <name>           One of: ${REORDER_ACTIONS.join(', ')}

Options:
  --db <path>               Optional explicit SQLite file override for the opened db
  --json                    Emit machine-readable success/error payloads
  --help, -h                Show this help message

Output:
  Text mode prints the requested action and before/after sibling order.
  JSON mode prints { ok, command, action, canvas, matchedCount, matchedIds, parentGroupId, beforeOrder, afterOrder, changedIds }.

Notes:
  - all reordered ids must share the same direct parentGroupId.
  - reorder updates sibling zIndex ordering only; positions and data are untouched.
  - no-op reorder requests fail clearly instead of silently succeeding.
  - multiple selected ids preserve their relative order when moved as a group.
`);
}

function exitWithReorderJsonError(error: TReorderJsonError): never {
  console.error(JSON.stringify(error));
  process.exit(1);
}

function exitWithReorderTextError(message: string): never {
  console.error(message);
  process.exit(1);
}

function exitReorderError(wantsJson: boolean, error: TReorderJsonError): never {
  if (wantsJson) exitWithReorderJsonError(error);
  exitWithReorderTextError(error.message);
}

export async function runCanvasReorder(argv: readonly string[]): Promise<never> {
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
      action: { type: 'string' },
    },
  });

  const wantsJson = Boolean(values.json);
  const canvasId = typeof values.canvas === 'string' ? values.canvas : null;
  const canvasNameQuery = typeof values['canvas-name'] === 'string' ? values['canvas-name'] : null;

  if (values.help) {
    printReorderHelp();
    process.exit(0);
  }

  const parsed = parseCliArgv(argv);
  const config = buildCliConfig(parsed);
  const state = createLocalCanvasState(config);

  try {
    const result = await executeCanvasReorder(state.context, {
      canvasId,
      canvasNameQuery,
      ids: (Array.isArray(values.id) ? values.id : values.id === undefined ? [] : [values.id]).flatMap((value) => typeof value === 'string' ? value.split(',') : []),
      action: (typeof values.action === 'string' ? values.action.trim() : '') as TReorderAction,
    });

    if (wantsJson) {
      console.log(JSON.stringify(result));
      process.exit(0);
    }

    process.stdout.write(renderCanvasReorderText(result));
    process.exit(0);
  } catch (error) {
    if (error instanceof CanvasCmdError) {
      exitReorderError(wantsJson, error.details as TReorderJsonError);
    }

    exitReorderError(wantsJson, {
      ok: false,
      command: 'canvas.reorder',
      code: 'CANVAS_BOOTSTRAP_FAILED',
      message: error instanceof Error ? error.message : String(error),
      canvasId,
      canvasNameQuery,
    });
  } finally {
    state.dispose();
  }
}
