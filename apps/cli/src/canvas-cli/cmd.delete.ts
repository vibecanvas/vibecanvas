import { parseArgs } from 'node:util';
import { CanvasCmdError, executeCanvasDelete, renderCanvasDeleteText, type TDeleteEffectsMode } from '@vibecanvas/canvas-cmds';
import { createLocalCanvasState } from './local-state';

type TDeleteJsonError = {
  ok: false;
  command: 'canvas.delete';
  code: string;
  message: string;
  canvasId?: string | null;
  canvasNameQuery?: string | null;
};

function printDeleteHelp(): void {
  console.log(`Usage: vibecanvas canvas delete [options]

Permanently delete element or group ids from one selected canvas.

Required canvas selector (choose exactly one):
  --canvas <id>                 Select one canvas by exact canvas row id
  --canvas-name <query>         Select one canvas by unique case-insensitive name substring

Required target selector:
  --id <id>                     Exact element/group id to delete (repeatable)

Effects mode (optional, default doc-only):
  --doc-only                    Mutate the persisted canvas doc only (default)
  --with-effects-if-available   Also attempt best-effort live plugin cleanup; missing effects are recorded as warnings

Options:
  --db <path>                   Optional explicit SQLite file override for the opened db
  --json                        Emit machine-readable success/error payloads
  --help, -h                    Show this help message

Cascade behavior:
  - Deleting a group also deletes every descendant element and every nested descendant group.
  - Deleting an element removes only that element; sibling and parent state is untouched.
  - Repeated or overlapping --id values are deduplicated before mutation.

Output:
  Text mode prints a deletion summary line plus any warnings.
  JSON mode prints { ok, command, effectsMode, canvas, matchedCount, matchedIds, deletedElementIds, deletedGroupIds, skippedEffects, warnings }.
`);
}

function exitWithDeleteJsonError(error: TDeleteJsonError): never {
  console.error(JSON.stringify(error));
  process.exit(1);
}

function exitWithDeleteTextError(message: string): never {
  console.error(message);
  process.exit(1);
}

function exitDeleteError(wantsJson: boolean, error: TDeleteJsonError): never {
  if (wantsJson) exitWithDeleteJsonError(error);
  exitWithDeleteTextError(error.message);
}

export async function runCanvasDelete(argv: readonly string[]): Promise<never> {
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
      'doc-only': { type: 'boolean', default: false },
      'with-effects-if-available': { type: 'boolean', default: false },
    },
  });

  const wantsJson = Boolean(values.json);
  const canvasId = typeof values.canvas === 'string' ? values.canvas : null;
  const canvasNameQuery = typeof values['canvas-name'] === 'string' ? values['canvas-name'] : null;

  if (values.help) {
    printDeleteHelp();
    process.exit(0);
  }

  const docOnly = Boolean(values['doc-only']);
  const withEffects = Boolean(values['with-effects-if-available']);
  if (docOnly && withEffects) {
    exitDeleteError(wantsJson, {
      ok: false,
      command: 'canvas.delete',
      code: 'CANVAS_DELETE_EFFECTS_MODE_CONFLICT',
      message: "Pass at most one effects mode: either --doc-only or --with-effects-if-available.",
      canvasId,
      canvasNameQuery,
    });
  }
  const effectsMode: TDeleteEffectsMode = withEffects ? 'with-effects-if-available' : 'doc-only';

  const state = createLocalCanvasState(argv);

  try {
    const result = await executeCanvasDelete(state.context, {
      canvasId,
      canvasNameQuery,
      ids: (Array.isArray(values.id) ? values.id : values.id === undefined ? [] : [values.id]).flatMap((value) => typeof value === 'string' ? value.split(',') : []),
      effectsMode,
    });

    if (wantsJson) {
      console.log(JSON.stringify(result));
      process.exit(0);
    }

    process.stdout.write(renderCanvasDeleteText(result));
    process.exit(0);
  } catch (error) {
    if (error instanceof CanvasCmdError) {
      exitDeleteError(wantsJson, error.details as TDeleteJsonError);
    }

    exitDeleteError(wantsJson, {
      ok: false,
      command: 'canvas.delete',
      code: 'CANVAS_BOOTSTRAP_FAILED',
      message: error instanceof Error ? error.message : String(error),
      canvasId,
      canvasNameQuery,
    });
  } finally {
    state.dispose();
  }
}
