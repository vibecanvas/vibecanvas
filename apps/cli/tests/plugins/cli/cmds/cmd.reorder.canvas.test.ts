import { afterEach, describe, expect, test } from 'bun:test';
import { createCliTestContext, createGroup, createRectElement, expectExitCode, expectNoStderr, parseJsonStdout, type TCliTestContext } from '../../../cli/harness';

type TOrderEntry = { id: string; zIndex: string; kind: 'element' | 'group' };

type TReorderJson = {
  ok: true;
  command: 'canvas.reorder';
  action: 'front' | 'back' | 'forward' | 'backward';
  canvas: { id: string; name: string };
  matchedCount: number;
  matchedIds: string[];
  parentGroupId: string | null;
  beforeOrder: TOrderEntry[];
  afterOrder: TOrderEntry[];
  changedIds: string[];
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

function orderedZIndex(index: number): string {
  return `z${String(index).padStart(8, '0')}`;
}

describe('canvas CLI reorder', () => {
  test('brings a middle element to the front and rewrites sibling zIndices deterministically', async () => {
    const context = await createContext();
    const rectA = createRectElement({ id: 'rect-a', zIndex: 'a0' });
    const rectB = createRectElement({ id: 'rect-b', zIndex: 'a1' });
    const rectC = createRectElement({ id: 'rect-c', zIndex: 'a2' });
    const seeded = await context.seedCanvasFixture({ name: 'reorder-front-canvas', elements: { [rectA.id]: rectA, [rectB.id]: rectB, [rectC.id]: rectC } });

    const result = await context.runCanvasCli(['reorder', '--canvas', seeded.canvas.id, '--id', 'rect-a', '--action', 'front', '--json']);

    expectExitCode(result, 0);
    expectNoStderr(result);
    const payload = parseJsonStdout<TReorderJson>(result);
    expect(payload).toMatchObject({
      ok: true,
      command: 'canvas.reorder',
      action: 'front',
      matchedCount: 1,
      matchedIds: ['rect-a'],
      parentGroupId: null,
    });
    expect(payload.beforeOrder.map((entry) => entry.id)).toEqual(['rect-a', 'rect-b', 'rect-c']);
    expect(payload.afterOrder.map((entry) => entry.id)).toEqual(['rect-b', 'rect-c', 'rect-a']);
    expect(payload.afterOrder.map((entry) => entry.zIndex)).toEqual([orderedZIndex(0), orderedZIndex(1), orderedZIndex(2)]);
    expect(payload.changedIds).toEqual(['rect-a', 'rect-b', 'rect-c']);

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.elements['rect-a']?.zIndex).toBe(orderedZIndex(2));
    expect(doc.elements['rect-b']?.zIndex).toBe(orderedZIndex(0));
    expect(doc.elements['rect-c']?.zIndex).toBe(orderedZIndex(1));
  });

  test('sends the top element to the back', async () => {
    const context = await createContext();
    const rectA = createRectElement({ id: 'rect-a', zIndex: 'a0' });
    const rectB = createRectElement({ id: 'rect-b', zIndex: 'a1' });
    const rectC = createRectElement({ id: 'rect-c', zIndex: 'a2' });
    const seeded = await context.seedCanvasFixture({ name: 'reorder-back-canvas', elements: { [rectA.id]: rectA, [rectB.id]: rectB, [rectC.id]: rectC } });

    const result = await context.runCanvasCli(['reorder', '--canvas', seeded.canvas.id, '--id', 'rect-c', '--action', 'back', '--json']);

    expectExitCode(result, 0);
    expectNoStderr(result);
    const payload = parseJsonStdout<TReorderJson>(result);
    expect(payload.afterOrder.map((entry) => entry.id)).toEqual(['rect-c', 'rect-a', 'rect-b']);

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.elements['rect-c']?.zIndex).toBe(orderedZIndex(0));
    expect(doc.elements['rect-a']?.zIndex).toBe(orderedZIndex(1));
    expect(doc.elements['rect-b']?.zIndex).toBe(orderedZIndex(2));
  });

  test('nudges an element one step forward by swapping with its upper neighbor', async () => {
    const context = await createContext();
    const rectA = createRectElement({ id: 'rect-a', zIndex: 'a0' });
    const rectB = createRectElement({ id: 'rect-b', zIndex: 'a1' });
    const rectC = createRectElement({ id: 'rect-c', zIndex: 'a2' });
    const seeded = await context.seedCanvasFixture({ name: 'reorder-forward-canvas', elements: { [rectA.id]: rectA, [rectB.id]: rectB, [rectC.id]: rectC } });

    const result = await context.runCanvasCli(['reorder', '--canvas', seeded.canvas.id, '--id', 'rect-a', '--action', 'forward', '--json']);

    expectExitCode(result, 0);
    const payload = parseJsonStdout<TReorderJson>(result);
    expect(payload.afterOrder.map((entry) => entry.id)).toEqual(['rect-b', 'rect-a', 'rect-c']);
  });

  test('nudges an element one step backward by swapping with its lower neighbor', async () => {
    const context = await createContext();
    const rectA = createRectElement({ id: 'rect-a', zIndex: 'a0' });
    const rectB = createRectElement({ id: 'rect-b', zIndex: 'a1' });
    const rectC = createRectElement({ id: 'rect-c', zIndex: 'a2' });
    const seeded = await context.seedCanvasFixture({ name: 'reorder-backward-canvas', elements: { [rectA.id]: rectA, [rectB.id]: rectB, [rectC.id]: rectC } });

    const result = await context.runCanvasCli(['reorder', '--canvas', seeded.canvas.id, '--id', 'rect-c', '--action', 'backward', '--json']);

    expectExitCode(result, 0);
    const payload = parseJsonStdout<TReorderJson>(result);
    expect(payload.afterOrder.map((entry) => entry.id)).toEqual(['rect-a', 'rect-c', 'rect-b']);
  });

  test('preserves the relative order of multiple selected items when bringing them to the front', async () => {
    const context = await createContext();
    const rectA = createRectElement({ id: 'rect-a', zIndex: 'a0' });
    const rectB = createRectElement({ id: 'rect-b', zIndex: 'a1' });
    const rectC = createRectElement({ id: 'rect-c', zIndex: 'a2' });
    const rectD = createRectElement({ id: 'rect-d', zIndex: 'a3' });
    const seeded = await context.seedCanvasFixture({ name: 'reorder-multi-canvas', elements: { [rectA.id]: rectA, [rectB.id]: rectB, [rectC.id]: rectC, [rectD.id]: rectD } });

    const result = await context.runCanvasCli(['reorder', '--canvas', seeded.canvas.id, '--id', 'rect-a', '--id', 'rect-c', '--action', 'front', '--json']);

    expectExitCode(result, 0);
    const payload = parseJsonStdout<TReorderJson>(result);
    expect(payload.matchedIds).toEqual(['rect-a', 'rect-c']);
    expect(payload.afterOrder.map((entry) => entry.id)).toEqual(['rect-b', 'rect-d', 'rect-a', 'rect-c']);
  });

  test('reports CANVAS_REORDER_NO_OP when the requested action would leave the sibling order unchanged', async () => {
    const context = await createContext();
    const rectA = createRectElement({ id: 'rect-a', zIndex: 'a0' });
    const rectB = createRectElement({ id: 'rect-b', zIndex: 'a1' });
    const seeded = await context.seedCanvasFixture({ name: 'reorder-noop-canvas', elements: { [rectA.id]: rectA, [rectB.id]: rectB } });

    const result = await context.runCanvasCli(['reorder', '--canvas', seeded.canvas.id, '--id', 'rect-b', '--action', 'front', '--json']);

    expectExitCode(result, 1);
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      command: 'canvas.reorder',
      code: 'CANVAS_REORDER_NO_OP',
      canvasId: seeded.canvas.id,
    });

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.elements['rect-a']?.zIndex).toBe('a0');
    expect(doc.elements['rect-b']?.zIndex).toBe('a1');
  });

  test('rejects ids from different parent groups with CANVAS_REORDER_PARENT_MISMATCH', async () => {
    const context = await createContext();
    const group = createGroup({ id: 'group-parent' });
    const inside = createRectElement({ id: 'rect-inside', parentGroupId: group.id, zIndex: 'a0' });
    const outside = createRectElement({ id: 'rect-outside', zIndex: 'a1' });
    const seeded = await context.seedCanvasFixture({
      name: 'reorder-parent-mismatch-canvas',
      groups: { [group.id]: group },
      elements: { [inside.id]: inside, [outside.id]: outside },
    });

    const result = await context.runCanvasCli(['reorder', '--canvas', seeded.canvas.id, '--id', inside.id, '--id', outside.id, '--action', 'front', '--json']);

    expectExitCode(result, 1);
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      command: 'canvas.reorder',
      code: 'CANVAS_REORDER_PARENT_MISMATCH',
      canvasId: seeded.canvas.id,
    });
  });

  test('fails clearly on invalid action, missing target, missing ids, and missing selector', async () => {
    const context = await createContext();
    const rect = createRectElement({ id: 'rect-only', zIndex: 'a0' });
    const seeded = await context.seedCanvasFixture({ name: 'reorder-errors-canvas', elements: { [rect.id]: rect } });

    const invalidAction = await context.runCanvasCli(['reorder', '--canvas', seeded.canvas.id, '--id', rect.id, '--action', 'sideways', '--json']);
    expectExitCode(invalidAction, 1);
    expect(JSON.parse(invalidAction.stderr)).toMatchObject({
      ok: false,
      command: 'canvas.reorder',
      code: 'CANVAS_REORDER_ACTION_INVALID',
    });

    const missingTarget = await context.runCanvasCli(['reorder', '--canvas', seeded.canvas.id, '--id', 'does-not-exist', '--action', 'front', '--json']);
    expectExitCode(missingTarget, 1);
    expect(JSON.parse(missingTarget.stderr)).toMatchObject({
      ok: false,
      command: 'canvas.reorder',
      code: 'CANVAS_REORDER_TARGET_NOT_FOUND',
      canvasId: seeded.canvas.id,
    });

    const missingIds = await context.runCanvasCli(['reorder', '--canvas', seeded.canvas.id, '--action', 'front', '--json']);
    expectExitCode(missingIds, 1);
    expect(JSON.parse(missingIds.stderr)).toMatchObject({
      ok: false,
      command: 'canvas.reorder',
      code: 'CANVAS_REORDER_ID_REQUIRED',
      canvasId: seeded.canvas.id,
    });

    const missingSelector = await context.runCanvasCli(['reorder', '--id', rect.id, '--action', 'front', '--json']);
    expectExitCode(missingSelector, 1);
    expect(JSON.parse(missingSelector.stderr)).toMatchObject({
      ok: false,
      command: 'canvas.reorder',
      code: 'CANVAS_SELECTOR_REQUIRED',
    });
  });
});
