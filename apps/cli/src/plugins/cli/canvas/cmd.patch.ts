import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { CanvasCmdError, executeCanvasPatch, renderCanvasPatchText, type TCanvasPatchEnvelope } from '@vibecanvas/canvas-cmds';
import { createOfflineCanvasState, createOnlineCanvasSafeClient, discoverLocalCanvasServer } from '../canvas.shared';

type TPatchJsonError = {
  ok: false;
  command: 'canvas.patch';
  code: string;
  message: string;
  canvasId?: string | null;
  canvasNameQuery?: string | null;
};

function printPatchHelp(): void {
  console.log(`Usage: vibecanvas canvas patch [options]

Patch explicit element/group ids inside one selected canvas using a structured JSON payload.

Required canvas selector (choose exactly one):
  --canvas <id>             Select one canvas by exact canvas row id
  --canvas-name <query>     Select one canvas by unique case-insensitive name substring

Required target selector:
  --id <id>                 Exact element/group id to patch (repeatable)

Required payload source (choose exactly one):
  --patch <json>            Inline JSON payload
  --patch-file <path>       Read the JSON payload from one file
  --patch-stdin             Read the JSON payload from stdin

Payload envelope:
  {
    "element": {
      "x": 120,
      "y": 80,
      "rotation": 15,
      "locked": false,
      "parentGroupId": "group-root",
      "style": { "backgroundColor": "#ff0000" },
      "data": { "text": "hello" }
    },
    "group": {
      "locked": true,
      "parentGroupId": null,
      "zIndex": "a2"
    }
  }

Options:
  --db <path>               Optional explicit SQLite file override for the opened db
  --json                    Emit machine-readable success/error payloads
  --help, -h                Show this help message

Output:
  Text mode prints the patch summary and changed ids.
  JSON mode prints { ok, command, patch, canvas, matchedCount, matchedIds, changedCount, changedIds }.

Notes:
  - ids are exact only; patch does not accept query-style selectors.
  - mixed element/group ids require matching payload branches for every matched kind.
  - element data patches are shallow top-level updates and must use fields valid for every matched element type.
  - element style patches are shallow top-level updates.

Examples:
  vibecanvas canvas patch --canvas 3d3f... --id rect-1 --patch '{"element":{"style":{"backgroundColor":"#ff0000"}}}' --json
  vibecanvas canvas patch --canvas-name design --id text-1 --patch-file ./patch.json
  printf '%s' '{"group":{"locked":true}}' | vibecanvas canvas patch --canvas 3d3f... --id group-1 --patch-stdin --json
`);
}

function exitWithPatchJsonError(error: TPatchJsonError): never {
  console.error(JSON.stringify(error));
  process.exit(1);
}

function exitWithPatchTextError(message: string): never {
  console.error(message);
  process.exit(1);
}

function exitPatchError(wantsJson: boolean, error: TPatchJsonError): never {
  if (wantsJson) exitWithPatchJsonError(error);
  exitWithPatchTextError(error.message);
}

async function readStdinText(): Promise<string> {
  let output = '';
  for await (const chunk of process.stdin) {
    output += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
  }
  return output;
}

async function resolvePatchPayload(args: {
  values: Record<string, unknown>;
  wantsJson: boolean;
  canvasId: string | null;
  canvasNameQuery: string | null;
}): Promise<TCanvasPatchEnvelope> {
  const inlinePatch = typeof args.values.patch === 'string' ? args.values.patch : null;
  const patchFile = typeof args.values['patch-file'] === 'string' ? args.values['patch-file'] : null;
  const patchStdin = Boolean(args.values['patch-stdin']);
  const selectedSources = [inlinePatch ? 'inline' : null, patchFile ? 'file' : null, patchStdin ? 'stdin' : null].filter((value): value is string => value !== null);

  if (selectedSources.length !== 1) {
    exitPatchError(args.wantsJson, {
      ok: false,
      command: 'canvas.patch',
      code: 'CANVAS_PATCH_PAYLOAD_REQUIRED',
      message: 'Pass exactly one patch payload source: --patch <json>, --patch-file <path>, or --patch-stdin.',
      canvasId: args.canvasId,
      canvasNameQuery: args.canvasNameQuery,
    });
  }

  try {
    const raw = inlinePatch ?? (patchFile ? await readFile(patchFile, 'utf8') : await readStdinText());
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      exitPatchError(args.wantsJson, {
        ok: false,
        command: 'canvas.patch',
        code: 'CANVAS_PATCH_PAYLOAD_INVALID',
        message: 'Patch payload must decode to one JSON object.',
        canvasId: args.canvasId,
        canvasNameQuery: args.canvasNameQuery,
      });
    }
    return parsed as TCanvasPatchEnvelope;
  } catch (error) {
    exitPatchError(args.wantsJson, {
      ok: false,
      command: 'canvas.patch',
      code: 'CANVAS_PATCH_PAYLOAD_INVALID',
      message: error instanceof Error ? `Failed to parse patch payload: ${error.message}` : `Failed to parse patch payload: ${String(error)}`,
      canvasId: args.canvasId,
      canvasNameQuery: args.canvasNameQuery,
    });
  }
}

export async function runCanvasPatch(argv: readonly string[]): Promise<never> {
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
      patch: { type: 'string' },
      'patch-file': { type: 'string' },
      'patch-stdin': { type: 'boolean', default: false },
    },
  });

  const wantsJson = Boolean(values.json);
  const canvasId = typeof values.canvas === 'string' ? values.canvas : null;
  const canvasNameQuery = typeof values['canvas-name'] === 'string' ? values['canvas-name'] : null;

  if (values.help) {
    printPatchHelp();
    process.exit(0);
  }

  const patch = await resolvePatchPayload({ values: values as Record<string, unknown>, wantsJson, canvasId, canvasNameQuery });
  const ids = (Array.isArray(values.id) ? values.id : values.id === undefined ? [] : [values.id]).flatMap((value) => typeof value === 'string' ? value.split(',') : []);
  const hasExplicitDbPath = typeof values.db === 'string';

  const discoveredServer = hasExplicitDbPath ? null : await discoverLocalCanvasServer(argv);

  if (discoveredServer) {
    const safeClient = await createOnlineCanvasSafeClient(discoveredServer.port);
    const [clientError, result] = await safeClient.api.canvas.cmd.patch({
      canvasId,
      canvasNameQuery,
      ids,
      patch,
    });

    if (clientError || !result) {
      const message = clientError instanceof Error ? clientError.message : String(clientError ?? 'canvas patch failed');
      exitPatchError(wantsJson, {
        ok: false,
        command: 'canvas.patch',
        code: 'CANVAS_PATCH_FAILED',
        message,
        canvasId,
        canvasNameQuery,
      });
    }

    if (wantsJson) {
      console.log(JSON.stringify(result));
      process.exit(0);
    }

    process.stdout.write(renderCanvasPatchText(result));
    process.exit(0);
  }

  const state = await createOfflineCanvasState(argv);

  try {
    const result = await executeCanvasPatch(state.context, {
      canvasId,
      canvasNameQuery,
      ids,
      patch,
    });

    if (wantsJson) {
      console.log(JSON.stringify(result));
      process.exit(0);
    }

    process.stdout.write(renderCanvasPatchText(result));
    process.exit(0);
  } catch (error) {
    if (error instanceof CanvasCmdError) {
      exitPatchError(wantsJson, error.details as TPatchJsonError);
    }

    exitPatchError(wantsJson, {
      ok: false,
      command: 'canvas.patch',
      code: 'CANVAS_BOOTSTRAP_FAILED',
      message: error instanceof Error ? error.message : String(error),
      canvasId,
      canvasNameQuery,
    });
  } finally {
    state.dispose();
  }
}
