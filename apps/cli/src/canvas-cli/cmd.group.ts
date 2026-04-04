import { parseArgs } from 'node:util';
import type { TCanvasDoc, TElement, TGroup } from '@vibecanvas/shell/automerge/index';
import { normalizeCanvas, resolveCanvasSelection, sortIds, type TCanvasRow } from '@vibecanvas/canvas-cmds';
import { createLocalCanvasState } from '../plugins/cli/canvas.local-state';
import { buildCliConfig } from '../build-config';
import { parseCliArgv } from '../parse-argv';

type TGroupJsonError = {
  ok: false;
  command: 'canvas.group';
  code: string;
  message: string;
  canvasId?: string | null;
  canvasNameQuery?: string | null;
  matches?: Array<{ id: string; name: string }>;
};

type TGroupJsonSuccess = {
  ok: true;
  command: 'canvas.group';
  canvas: ReturnType<typeof normalizeCanvas>;
  matchedCount: number;
  matchedIds: string[];
  group: {
    id: string;
    parentGroupId: string | null;
    childIds: string[];
  };
};

function printGroupHelp(): void {
  console.log(`Usage: vibecanvas canvas group [options]

Group explicit element ids inside one selected canvas.

Required canvas selector (choose exactly one):
  --canvas <id>             Select one canvas by exact canvas row id
  --canvas-name <query>     Select one canvas by unique case-insensitive name substring

Required target selector:
  --id <id>                 Exact element id to group (repeatable)

Options:
  --db <path>               Optional explicit SQLite file override for the opened db
  --json                    Emit machine-readable success/error payloads
  --help, -h                Show this help message

Output:
  Text mode prints the new group id and grouped child ids.
  JSON mode prints { ok, command, canvas, matchedCount, matchedIds, group: { id, parentGroupId, childIds } }.

Notes:
  - grouping currently supports explicit element ids only.
  - all ids must share the same direct parentGroupId.
  - grouping preserves absolute element positions and only changes structure.
`);
}

function exitWithGroupJsonError(error: TGroupJsonError): never {
  console.error(JSON.stringify(error));
  process.exit(1);
}

function exitWithGroupTextError(message: string): never {
  console.error(message);
  process.exit(1);
}

function exitGroupError(wantsJson: boolean, error: TGroupJsonError): never {
  if (wantsJson) exitWithGroupJsonError(error);
  exitWithGroupTextError(error.message);
}

function parseGroupIds(args: {
  raw: unknown;
  wantsJson: boolean;
  canvasId: string | null;
  canvasNameQuery: string | null;
}): string[] {
  const values = Array.isArray(args.raw) ? args.raw : args.raw === undefined ? [] : [args.raw];
  const ids = sortIds([...new Set(values.flatMap((value) => typeof value === 'string' ? value.split(',') : []).map((value) => value.trim()).filter(Boolean))]);
  if (ids.length >= 2) return ids;

  exitGroupError(args.wantsJson, {
    ok: false,
    command: 'canvas.group',
    code: 'CANVAS_GROUP_ID_REQUIRED',
    message: 'Group requires at least two --id <id> targets.',
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
  });
}

function resolveElementsByIds(args: {
  doc: TCanvasDoc;
  ids: string[];
  wantsJson: boolean;
  canvasId: string;
  canvasNameQuery: string | null;
}): TElement[] {
  const missingIds = args.ids.filter((id) => !args.doc.elements[id] && !args.doc.groups[id]);
  if (missingIds.length > 0) {
    exitGroupError(args.wantsJson, {
      ok: false,
      command: 'canvas.group',
      code: 'CANVAS_GROUP_TARGET_NOT_FOUND',
      message: `Target ids were not found in canvas '${args.doc.name}': ${sortIds(missingIds).join(', ')}.`,
      canvasId: args.canvasId,
      canvasNameQuery: args.canvasNameQuery,
    });
  }

  const groupIds = args.ids.filter((id) => Boolean(args.doc.groups[id]));
  if (groupIds.length > 0) {
    exitGroupError(args.wantsJson, {
      ok: false,
      command: 'canvas.group',
      code: 'CANVAS_GROUP_TARGET_KIND_INVALID',
      message: `Grouping currently supports element ids only. Received group ids: ${sortIds(groupIds).join(', ')}.`,
      canvasId: args.canvasId,
      canvasNameQuery: args.canvasNameQuery,
    });
  }

  return args.ids.map((id) => args.doc.elements[id]!).filter(Boolean);
}

function ensureSameParentGroupId(args: {
  elements: readonly TElement[];
  wantsJson: boolean;
  canvasId: string;
  canvasNameQuery: string | null;
}): string | null {
  const parentGroupIds = [...new Set(args.elements.map((element) => element.parentGroupId ?? null))];
  if (parentGroupIds.length === 1) return parentGroupIds[0] ?? null;

  exitGroupError(args.wantsJson, {
    ok: false,
    command: 'canvas.group',
    code: 'CANVAS_GROUP_PARENT_MISMATCH',
    message: 'All grouped ids must share the same direct parentGroupId.',
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
  });
}

function renderGroupTextResult(result: TGroupJsonSuccess): string {
  return `Grouped ${result.matchedCount} elements in canvas=${result.canvas.id} name=${JSON.stringify(result.canvas.name)} groupId=${result.group.id} parentGroupId=${result.group.parentGroupId ?? 'null'} childIds=${JSON.stringify(result.group.childIds)}\n`;
}

export async function runCanvasGroup(argv: readonly string[]): Promise<never> {
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
    },
  });

  const wantsJson = Boolean(values.json);
  const canvasId = typeof values.canvas === 'string' ? values.canvas : null;
  const canvasNameQuery = typeof values['canvas-name'] === 'string' ? values['canvas-name'] : null;

  if (values.help) {
    printGroupHelp();
    process.exit(0);
  }

  const ids = parseGroupIds({ raw: values.id, wantsJson, canvasId, canvasNameQuery });
  const parsed = parseCliArgv(argv);
  const config = buildCliConfig(parsed);
  const state = createLocalCanvasState(config);

  try {
    const rows = await state.context.listCanvasRows() as TCanvasRow[];
    const selectedCanvas = resolveCanvasSelection({
      rows,
      selector: { canvasId, canvasNameQuery },
      command: 'canvas.group',
      actionLabel: 'Group',
      fail: (error) => exitGroupError(wantsJson, error as TGroupJsonError),
    });
    const resolvedHandle = await state.context.loadCanvasHandle(selectedCanvas);
    const currentDoc = resolvedHandle.handle.doc();
    if (!currentDoc) throw new Error(`Canvas doc '${selectedCanvas.automerge_url}' is unavailable.`);
    const doc = structuredClone(currentDoc);
    const matchedElements = resolveElementsByIds({ doc, ids, wantsJson, canvasId: selectedCanvas.id, canvasNameQuery });
    const parentGroupId = ensureSameParentGroupId({ elements: matchedElements, wantsJson, canvasId: selectedCanvas.id, canvasNameQuery });
    const groupId = crypto.randomUUID();
    const childIds = sortIds(matchedElements.map((element) => element.id));
    const maxCreatedAt = matchedElements.reduce((max, element) => Math.max(max, element.createdAt ?? 0, element.updatedAt ?? 0), 0);
    const createdAt = Math.max(Date.now(), maxCreatedAt + 1);
    const zIndex = matchedElements.map((element) => element.zIndex).sort((left, right) => left.localeCompare(right))[0] ?? 'a0';
    const newGroup: TGroup = { id: groupId, parentGroupId, zIndex, locked: false, createdAt };
    const handle = resolvedHandle.handle;
    const now = Date.now();

    handle.change((nextDoc) => {
      nextDoc.groups[groupId] = structuredClone(newGroup);
      for (const childId of childIds) {
        const element = nextDoc.elements[childId];
        if (!element) continue;
        element.parentGroupId = groupId;
        element.updatedAt = now;
      }
    });

    await state.context.waitForMutation({
      source: resolvedHandle.source,
      handle,
      automergeUrl: selectedCanvas.automerge_url,
      predicate: (persistedDoc) => {
        const persistedGroup = persistedDoc.groups[groupId];
        if (!persistedGroup) return false;
        if ((persistedGroup.parentGroupId ?? null) !== parentGroupId) return false;
        return childIds.every((childId) => persistedDoc.elements[childId]?.parentGroupId === groupId);
      },
    });

    const result: TGroupJsonSuccess = {
      ok: true,
      command: 'canvas.group',
      canvas: normalizeCanvas(selectedCanvas),
      matchedCount: childIds.length,
      matchedIds: childIds,
      group: {
        id: groupId,
        parentGroupId,
        childIds,
      },
    };

    if (wantsJson) {
      console.log(JSON.stringify(result));
      process.exit(0);
    }

    process.stdout.write(renderGroupTextResult(result));
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    exitGroupError(wantsJson, {
      ok: false,
      command: 'canvas.group',
      code: 'CANVAS_BOOTSTRAP_FAILED',
      message,
      canvasId,
      canvasNameQuery,
    });
  } finally {
    state.dispose();
  }
}
