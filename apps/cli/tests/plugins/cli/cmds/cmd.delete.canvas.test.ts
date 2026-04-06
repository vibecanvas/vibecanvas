import { afterEach, describe, expect, test } from 'bun:test';
import { createCliTestContext, createGroup, createRectElement, expectExitCode, expectNoStderr, parseJsonStdout, type TCliTestContext } from '../../../cli/harness';

type TDeleteJson = {
  ok: true;
  command: 'canvas.delete';
  effectsMode: 'doc-only' | 'with-effects-if-available';
  canvas: { id: string; name: string };
  matchedCount: number;
  matchedIds: string[];
  deletedElementIds: string[];
  deletedGroupIds: string[];
  skippedEffects: Array<{ id: string; effect: string; reason: string }>;
  warnings: string[];
};

const contexts: TCliTestContext[] = [];

afterEach(async () => {
  while (contexts.length > 0) {
    await contexts.pop()?.cleanup();
  }
});

async function createContext(): Promise<TCliTestContext> {
  const context = await createCliTestContext();
  contexts.push(context);
  return context;
}

describe('canvas CLI delete', () => {
  test('deletes one element by id in default doc-only mode and leaves siblings intact', async () => {
    const context = await createContext();
    const keep = createRectElement({ id: 'rect-keep', x: 10, y: 20 });
    const target = createRectElement({ id: 'rect-target', x: 40, y: 80 });
    const seeded = await context.seedCanvasFixture({ name: 'delete-element-canvas', elements: { [keep.id]: keep, [target.id]: target } });

    const result = await context.runCanvasCli(['delete', '--canvas', seeded.canvas.id, '--id', target.id, '--json']);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(parseJsonStdout<TDeleteJson>(result)).toMatchObject({
      ok: true,
      command: 'canvas.delete',
      effectsMode: 'doc-only',
      matchedCount: 1,
      matchedIds: ['rect-target'],
      deletedElementIds: ['rect-target'],
      deletedGroupIds: [],
      skippedEffects: [],
      warnings: [],
    });

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.elements[target.id]).toBeUndefined();
    expect(doc.elements[keep.id]).toBeDefined();
  });

  test('deleting a group cascades to every descendant element and nested group', async () => {
    const context = await createContext();
    const rootGroup = createGroup({ id: 'group-root', zIndex: 'a0' });
    const childGroup = createGroup({ id: 'group-child', parentGroupId: rootGroup.id, zIndex: 'a1' });
    const direct = createRectElement({ id: 'rect-direct', parentGroupId: rootGroup.id, zIndex: 'a2' });
    const nested = createRectElement({ id: 'rect-nested', parentGroupId: childGroup.id, zIndex: 'a3' });
    const outside = createRectElement({ id: 'rect-outside', zIndex: 'a4' });
    const seeded = await context.seedCanvasFixture({
      name: 'delete-cascade-canvas',
      groups: { [rootGroup.id]: rootGroup, [childGroup.id]: childGroup },
      elements: { [direct.id]: direct, [nested.id]: nested, [outside.id]: outside },
    });

    const result = await context.runCanvasCli(['delete', '--canvas', seeded.canvas.id, '--id', rootGroup.id, '--json']);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(parseJsonStdout<TDeleteJson>(result)).toMatchObject({
      ok: true,
      command: 'canvas.delete',
      effectsMode: 'doc-only',
      matchedCount: 1,
      matchedIds: ['group-root'],
      deletedElementIds: ['rect-direct', 'rect-nested'],
      deletedGroupIds: ['group-child', 'group-root'],
      skippedEffects: [],
      warnings: [],
    });

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.groups[rootGroup.id]).toBeUndefined();
    expect(doc.groups[childGroup.id]).toBeUndefined();
    expect(doc.elements[direct.id]).toBeUndefined();
    expect(doc.elements[nested.id]).toBeUndefined();
    expect(doc.elements[outside.id]).toBeDefined();
  });

  test('deletes a mix of element and group ids in a single call with sorted output', async () => {
    const context = await createContext();
    const group = createGroup({ id: 'group-mixed', zIndex: 'a0' });
    const child = createRectElement({ id: 'rect-child', parentGroupId: group.id, zIndex: 'a1' });
    const loose = createRectElement({ id: 'rect-loose', zIndex: 'a2' });
    const keep = createRectElement({ id: 'rect-keep', zIndex: 'a3' });
    const seeded = await context.seedCanvasFixture({
      name: 'delete-mixed-canvas',
      groups: { [group.id]: group },
      elements: { [child.id]: child, [loose.id]: loose, [keep.id]: keep },
    });

    const result = await context.runCanvasCli(['delete', '--canvas', seeded.canvas.id, '--id', loose.id, '--id', group.id, '--json']);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(parseJsonStdout<TDeleteJson>(result)).toMatchObject({
      ok: true,
      command: 'canvas.delete',
      effectsMode: 'doc-only',
      matchedCount: 2,
      matchedIds: ['group-mixed', 'rect-loose'],
      deletedElementIds: ['rect-child', 'rect-loose'],
      deletedGroupIds: ['group-mixed'],
    });

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.groups[group.id]).toBeUndefined();
    expect(doc.elements[child.id]).toBeUndefined();
    expect(doc.elements[loose.id]).toBeUndefined();
    expect(doc.elements[keep.id]).toBeDefined();
  });

  test('with-effects-if-available records skipped cleanups and offline warning while still mutating the doc', async () => {
    const context = await createContext();
    const target = createRectElement({ id: 'rect-effects' });
    const seeded = await context.seedCanvasFixture({ name: 'delete-effects-canvas', elements: { [target.id]: target } });

    const result = await context.runCanvasCli(['delete', '--canvas', seeded.canvas.id, '--id', target.id, '--with-effects-if-available', '--json']);

    expectExitCode(result, 0);
    expectNoStderr(result);
    const payload = parseJsonStdout<TDeleteJson>(result);
    expect(payload).toMatchObject({
      ok: true,
      command: 'canvas.delete',
      effectsMode: 'with-effects-if-available',
      deletedElementIds: ['rect-effects'],
      deletedGroupIds: [],
    });
    expect(payload.skippedEffects).toEqual([
      { id: 'rect-effects', effect: 'live-plugin-cleanup', reason: 'cli-offline' },
    ]);
    expect(payload.warnings).toEqual([
      "Effects mode 'with-effects-if-available' is a no-op in offline CLI; 1 plugin cleanup skipped.",
    ]);

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.elements[target.id]).toBeUndefined();
  });

  test('fails with CANVAS_DELETE_TARGET_NOT_FOUND when an id does not exist and leaves the doc untouched', async () => {
    const context = await createContext();
    const rect = createRectElement({ id: 'rect-only' });
    const seeded = await context.seedCanvasFixture({ name: 'delete-missing-canvas', elements: { [rect.id]: rect } });

    const result = await context.runCanvasCli(['delete', '--canvas', seeded.canvas.id, '--id', 'missing-id', '--json']);

    expectExitCode(result, 1);
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      command: 'canvas.delete',
      code: 'CANVAS_DELETE_TARGET_NOT_FOUND',
      canvasId: seeded.canvas.id,
      canvasNameQuery: null,
    });

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.elements[rect.id]).toBeDefined();
  });

  test('fails with CANVAS_SELECTOR_REQUIRED when no canvas selector is provided', async () => {
    const context = await createContext();
    await context.seedCanvasFixture({ name: 'delete-no-selector' });

    const result = await context.runCanvasCli(['delete', '--id', 'anything', '--json']);

    expectExitCode(result, 1);
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      command: 'canvas.delete',
      code: 'CANVAS_SELECTOR_REQUIRED',
    });
  });

  test('fails with CANVAS_DELETE_ID_REQUIRED when no --id is provided', async () => {
    const context = await createContext();
    const seeded = await context.seedCanvasFixture({ name: 'delete-no-ids' });

    const result = await context.runCanvasCli(['delete', '--canvas', seeded.canvas.id, '--json']);

    expectExitCode(result, 1);
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      command: 'canvas.delete',
      code: 'CANVAS_DELETE_ID_REQUIRED',
      canvasId: seeded.canvas.id,
    });
  });

  test('fails with CANVAS_DELETE_EFFECTS_MODE_CONFLICT when both --doc-only and --with-effects-if-available are passed', async () => {
    const context = await createContext();
    const rect = createRectElement({ id: 'rect-conflict' });
    const seeded = await context.seedCanvasFixture({ name: 'delete-conflict-canvas', elements: { [rect.id]: rect } });

    const result = await context.runCanvasCli(['delete', '--canvas', seeded.canvas.id, '--id', rect.id, '--doc-only', '--with-effects-if-available', '--json']);

    expectExitCode(result, 1);
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      command: 'canvas.delete',
      code: 'CANVAS_DELETE_EFFECTS_MODE_CONFLICT',
      canvasId: seeded.canvas.id,
    });

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.elements[rect.id]).toBeDefined();
  });
});
