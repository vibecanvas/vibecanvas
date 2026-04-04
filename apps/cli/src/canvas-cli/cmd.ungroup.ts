import { parseArgs } from 'node:util';
import type { TCanvasDoc, TGroup } from '@vibecanvas/shell/automerge/index';
import { normalizeCanvas, resolveCanvasSelection, sortIds, type TCanvasRow } from '@vibecanvas/canvas-cmds';
import { createLocalCanvasState } from '../plugins/cli/canvas.local-state';
import { buildCliConfig } from '../build-config';
import { parseCliArgv } from '../parse-argv';

type TUngroupJsonError = {
  ok: false;
  command: 'canvas.ungroup';
  code: string;
  message: string;
  canvasId?: string | null;
  canvasNameQuery?: string | null;
  matches?: Array<{ id: string; name: string }>;
};

type TUngroupJsonSuccess = {
  ok: true;
  command: 'canvas.ungroup';
  canvas: ReturnType<typeof normalizeCanvas>;
  matchedCount: number;
  matchedIds: string[];
  removedGroupCount: number;
  removedGroupIds: string[];
  releasedChildCount: number;
  releasedChildIds: string[];
};

function printUngroupHelp(): void {
  console.log(`Usage: vibecanvas canvas ungroup [options]

Ungroup explicit group ids inside one selected canvas.

Required canvas selector (choose exactly one):
  --canvas <id>             Select one canvas by exact canvas row id
  --canvas-name <query>     Select one canvas by unique case-insensitive name substring

Required target selector:
  --id <id>                 Exact group id to ungroup (repeatable)

Options:
  --db <path>               Optional explicit SQLite file override for the opened db
  --json                    Emit machine-readable success/error payloads
  --help, -h                Show this help message

Output:
  Text mode prints removed group ids and released child ids.
  JSON mode prints { ok, command, canvas, matchedCount, matchedIds, removedGroupCount, removedGroupIds, releasedChildCount, releasedChildIds }.

Notes:
  - ungrouping currently supports explicit group ids only.
  - ungrouping preserves absolute element positions and only changes structure.
  - direct child groups are reparented to the removed group's parent.
`);
}

function exitWithUngroupJsonError(error: TUngroupJsonError): never {
  console.error(JSON.stringify(error));
  process.exit(1);
}

function exitWithUngroupTextError(message: string): never {
  console.error(message);
  process.exit(1);
}

function exitUngroupError(wantsJson: boolean, error: TUngroupJsonError): never {
  if (wantsJson) exitWithUngroupJsonError(error);
  exitWithUngroupTextError(error.message);
}

function parseUngroupIds(args: {
  raw: unknown;
  wantsJson: boolean;
  canvasId: string | null;
  canvasNameQuery: string | null;
}): string[] {
  const values = Array.isArray(args.raw) ? args.raw : args.raw === undefined ? [] : [args.raw];
  const ids = sortIds([...new Set(values.flatMap((value) => typeof value === 'string' ? value.split(',') : []).map((value) => value.trim()).filter(Boolean))]);
  if (ids.length > 0) return ids;

  exitUngroupError(args.wantsJson, {
    ok: false,
    command: 'canvas.ungroup',
    code: 'CANVAS_UNGROUP_ID_REQUIRED',
    message: 'Ungroup requires at least one --id <id> target.',
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
  });
}

function resolveGroupsByIds(args: {
  doc: TCanvasDoc;
  ids: string[];
  wantsJson: boolean;
  canvasId: string;
  canvasNameQuery: string | null;
}): TGroup[] {
  const missingIds = args.ids.filter((id) => !args.doc.elements[id] && !args.doc.groups[id]);
  if (missingIds.length > 0) {
    exitUngroupError(args.wantsJson, {
      ok: false,
      command: 'canvas.ungroup',
      code: 'CANVAS_UNGROUP_TARGET_NOT_FOUND',
      message: `Target ids were not found in canvas '${args.doc.name}': ${sortIds(missingIds).join(', ')}.`,
      canvasId: args.canvasId,
      canvasNameQuery: args.canvasNameQuery,
    });
  }

  const elementIds = args.ids.filter((id) => Boolean(args.doc.elements[id]));
  if (elementIds.length > 0) {
    exitUngroupError(args.wantsJson, {
      ok: false,
      command: 'canvas.ungroup',
      code: 'CANVAS_UNGROUP_TARGET_KIND_INVALID',
      message: `Ungroup currently supports group ids only. Received element ids: ${sortIds(elementIds).join(', ')}.`,
      canvasId: args.canvasId,
      canvasNameQuery: args.canvasNameQuery,
    });
  }

  return args.ids.map((id) => args.doc.groups[id]!).filter(Boolean);
}

function collectDirectChildIds(doc: TCanvasDoc, groupIds: readonly string[]): {
  releasedElementIds: string[];
  reparentedGroupIds: string[];
} {
  const releasedElementIds = new Set<string>();
  const reparentedGroupIds = new Set<string>();

  for (const groupId of groupIds) {
    for (const element of Object.values(doc.elements)) {
      if (element.parentGroupId === groupId) releasedElementIds.add(element.id);
    }

    for (const group of Object.values(doc.groups)) {
      if (group.parentGroupId === groupId && !groupIds.includes(group.id)) reparentedGroupIds.add(group.id);
    }
  }

  return {
    releasedElementIds: sortIds([...releasedElementIds]),
    reparentedGroupIds: sortIds([...reparentedGroupIds]),
  };
}

function renderUngroupTextResult(result: TUngroupJsonSuccess): string {
  return `Ungrouped ${result.removedGroupCount} groups in canvas=${result.canvas.id} name=${JSON.stringify(result.canvas.name)} removedGroupIds=${JSON.stringify(result.removedGroupIds)} releasedChildIds=${JSON.stringify(result.releasedChildIds)}\n`;
}

export async function runCanvasUngroup(argv: readonly string[]): Promise<never> {
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
    printUngroupHelp();
    process.exit(0);
  }

  const ids = parseUngroupIds({ raw: values.id, wantsJson, canvasId, canvasNameQuery });
  const parsed = parseCliArgv(argv);
  const config = buildCliConfig(parsed);
  const state = createLocalCanvasState(config);

  try {
    const rows = await state.context.listCanvasRows() as TCanvasRow[];
    const selectedCanvas = resolveCanvasSelection({
      rows,
      selector: { canvasId, canvasNameQuery },
      command: 'canvas.ungroup',
      actionLabel: 'Ungroup',
      fail: (error) => exitUngroupError(wantsJson, error as TUngroupJsonError),
    });
    const resolvedHandle = await state.context.loadCanvasHandle(selectedCanvas);
    const currentDoc = resolvedHandle.handle.doc();
    if (!currentDoc) throw new Error(`Canvas doc '${selectedCanvas.automerge_url}' is unavailable.`);
    const doc = structuredClone(currentDoc);
    const matchedGroups = resolveGroupsByIds({ doc, ids, wantsJson, canvasId: selectedCanvas.id, canvasNameQuery });
    const removedGroupIds = sortIds(matchedGroups.map((group) => group.id));
    const groupParentMap = new Map(matchedGroups.map((group) => [group.id, group.parentGroupId ?? null]));
    const { releasedElementIds, reparentedGroupIds } = collectDirectChildIds(doc, removedGroupIds);
    const handle = resolvedHandle.handle;
    const now = Date.now();

    handle.change((nextDoc) => {
      for (const removedGroupId of removedGroupIds) {
        const parentGroupId = groupParentMap.get(removedGroupId) ?? null;

        for (const element of Object.values(nextDoc.elements)) {
          if (element.parentGroupId !== removedGroupId) continue;
          element.parentGroupId = parentGroupId;
          element.updatedAt = now;
        }

        for (const group of Object.values(nextDoc.groups)) {
          if (group.id === removedGroupId) continue;
          if (group.parentGroupId !== removedGroupId) continue;
          if (groupParentMap.has(group.id)) continue;
          group.parentGroupId = parentGroupId;
        }

        delete nextDoc.groups[removedGroupId];
      }
    });

    await state.context.waitForMutation({
      source: resolvedHandle.source,
      handle,
      automergeUrl: selectedCanvas.automerge_url,
      predicate: (persistedDoc) => {
        if (removedGroupIds.some((groupId) => Boolean(persistedDoc.groups[groupId]))) return false;
        for (const releasedElementId of releasedElementIds) {
          const beforeParent = doc.elements[releasedElementId]?.parentGroupId ?? null;
          if (!beforeParent) return false;
          const expectedParent = groupParentMap.get(beforeParent) ?? null;
          if ((persistedDoc.elements[releasedElementId]?.parentGroupId ?? null) !== expectedParent) return false;
        }
        for (const reparentedGroupId of reparentedGroupIds) {
          const beforeParent = doc.groups[reparentedGroupId]?.parentGroupId ?? null;
          if (!beforeParent) return false;
          const expectedParent = groupParentMap.get(beforeParent) ?? null;
          if ((persistedDoc.groups[reparentedGroupId]?.parentGroupId ?? null) !== expectedParent) return false;
        }
        return true;
      },
    });

    const result: TUngroupJsonSuccess = {
      ok: true,
      command: 'canvas.ungroup',
      canvas: normalizeCanvas(selectedCanvas),
      matchedCount: removedGroupIds.length,
      matchedIds: removedGroupIds,
      removedGroupCount: removedGroupIds.length,
      removedGroupIds,
      releasedChildCount: releasedElementIds.length,
      releasedChildIds: releasedElementIds,
    };

    if (wantsJson) {
      console.log(JSON.stringify(result));
      process.exit(0);
    }

    process.stdout.write(renderUngroupTextResult(result));
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    exitUngroupError(wantsJson, {
      ok: false,
      command: 'canvas.ungroup',
      code: 'CANVAS_BOOTSTRAP_FAILED',
      message,
      canvasId,
      canvasNameQuery,
    });
  } finally {
    state.dispose();
  }
}
