import { afterEach, describe, expect, test } from 'bun:test';
import { createCliTestContext, createGroup, createRectElement, expectExitCode, expectNoStderr, parseJsonStdout, type TCliTestContext } from '../harness';

type TMoveJson = {
  ok: true;
  command: 'canvas.move';
  mode: 'relative' | 'absolute';
  input: { x: number; y: number };
  delta: { dx: number; dy: number };
  matchedCount: number;
  matchedIds: string[];
  changedCount: number;
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

describe('canvas CLI move', () => {
  test('moves one element relatively by explicit id and reports stable json output', async () => {
    const context = await createContext();
    const rect = createRectElement({ id: 'rect-1', x: 40, y: 80, updatedAt: 100 });
    const seeded = await context.seedCanvasFixture({ name: 'move-one-canvas', elements: { [rect.id]: rect } });

    const result = await context.runCanvasCli(['move', '--canvas', seeded.canvas.id, '--id', rect.id, '--relative', '--x', '15', '--y', '-5', '--json']);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(parseJsonStdout<TMoveJson>(result)).toMatchObject({
      ok: true,
      command: 'canvas.move',
      mode: 'relative',
      input: { x: 15, y: -5 },
      delta: { dx: 15, dy: -5 },
      matchedCount: 1,
      matchedIds: ['rect-1'],
      changedCount: 1,
      changedIds: ['rect-1'],
    });

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.elements[rect.id]?.x).toBe(55);
    expect(doc.elements[rect.id]?.y).toBe(75);
    expect(doc.elements[rect.id]?.updatedAt).toBeGreaterThan(100);
  });

  test('moves multiple ids relatively once and sorts changed ids deterministically', async () => {
    const context = await createContext();
    const rectB = createRectElement({ id: 'rect-b', x: 200, y: 300, updatedAt: 10 });
    const rectA = createRectElement({ id: 'rect-a', x: 20, y: 40, updatedAt: 20 });
    const seeded = await context.seedCanvasFixture({ name: 'move-multi-canvas', elements: { [rectB.id]: rectB, [rectA.id]: rectA } });

    const result = await context.runCanvasCli(['move', '--canvas', seeded.canvas.id, '--id', rectB.id, '--id', rectA.id, '--relative', '--x', '-10', '--y', '25', '--json']);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(parseJsonStdout<TMoveJson>(result)).toMatchObject({
      ok: true,
      command: 'canvas.move',
      mode: 'relative',
      input: { x: -10, y: 25 },
      delta: { dx: -10, dy: 25 },
      matchedCount: 2,
      matchedIds: ['rect-a', 'rect-b'],
      changedCount: 2,
      changedIds: ['rect-a', 'rect-b'],
    });

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.elements[rectA.id]?.x).toBe(10);
    expect(doc.elements[rectA.id]?.y).toBe(65);
    expect(doc.elements[rectB.id]?.x).toBe(190);
    expect(doc.elements[rectB.id]?.y).toBe(325);
  });

  test('moves a group id relatively by translating descendant elements only once', async () => {
    const context = await createContext();
    const rootGroup = createGroup({ id: 'group-root', zIndex: 'a0' });
    const childGroup = createGroup({ id: 'group-child', parentGroupId: rootGroup.id, zIndex: 'a1' });
    const direct = createRectElement({ id: 'rect-direct', x: 10, y: 20, parentGroupId: rootGroup.id, zIndex: 'a2' });
    const nested = createRectElement({ id: 'rect-nested', x: 50, y: 70, parentGroupId: childGroup.id, zIndex: 'a3' });
    const outside = createRectElement({ id: 'rect-outside', x: 400, y: 500, zIndex: 'a4' });
    const seeded = await context.seedCanvasFixture({
      name: 'move-subtree-canvas',
      groups: { [rootGroup.id]: rootGroup, [childGroup.id]: childGroup },
      elements: { [direct.id]: direct, [nested.id]: nested, [outside.id]: outside },
    });

    const result = await context.runCanvasCli(['move', '--canvas', seeded.canvas.id, '--id', rootGroup.id, '--relative', '--x', '7', '--y', '11', '--json']);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(parseJsonStdout<TMoveJson>(result)).toMatchObject({
      ok: true,
      command: 'canvas.move',
      mode: 'relative',
      input: { x: 7, y: 11 },
      delta: { dx: 7, dy: 11 },
      matchedCount: 1,
      matchedIds: ['group-root'],
      changedCount: 2,
      changedIds: ['rect-direct', 'rect-nested'],
    });

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.elements[direct.id]?.x).toBe(17);
    expect(doc.elements[direct.id]?.y).toBe(31);
    expect(doc.elements[nested.id]?.x).toBe(57);
    expect(doc.elements[nested.id]?.y).toBe(81);
    expect(doc.elements[outside.id]?.x).toBe(400);
    expect(doc.elements[outside.id]?.y).toBe(500);
    expect(doc.groups[rootGroup.id]).toEqual(rootGroup);
    expect(doc.groups[childGroup.id]).toEqual(childGroup);
  });

  test('moves one target absolutely', async () => {
    const context = await createContext();
    const rect = createRectElement({ id: 'rect-1', x: 40, y: 80 });
    const seeded = await context.seedCanvasFixture({ name: 'move-absolute-canvas', elements: { [rect.id]: rect } });

    const result = await context.runCanvasCli(['move', '--canvas', seeded.canvas.id, '--id', rect.id, '--absolute', '--x', '300', '--y', '120', '--json']);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(parseJsonStdout<TMoveJson>(result)).toMatchObject({
      ok: true,
      command: 'canvas.move',
      mode: 'absolute',
      input: { x: 300, y: 120 },
      delta: { dx: 260, dy: 40 },
      matchedCount: 1,
      matchedIds: ['rect-1'],
      changedCount: 1,
      changedIds: ['rect-1'],
    });

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.elements[rect.id]?.x).toBe(300);
    expect(doc.elements[rect.id]?.y).toBe(120);
  });

  test('fails clearly on invalid targets, ambiguous canvas selectors, and invalid absolute usage', async () => {
    const context = await createContext();
    const rectA = createRectElement({ id: 'rect-a' });
    const rectB = createRectElement({ id: 'rect-b' });
    const seeded = await context.seedCanvasFixture({ name: 'move-missing-target', elements: { [rectA.id]: rectA, [rectB.id]: rectB } });
    await context.seedCanvasFixture({ name: 'design board alpha' });
    await context.seedCanvasFixture({ name: 'design board beta' });

    const missingTarget = await context.runCanvasCli(['move', '--canvas', seeded.canvas.id, '--id', 'missing-id', '--relative', '--x', '1', '--y', '1', '--json']);
    expectExitCode(missingTarget, 1);
    expect(missingTarget.stdout).toBe('');
    expect(JSON.parse(missingTarget.stderr)).toMatchObject({
      ok: false,
      command: 'canvas.move',
      code: 'CANVAS_MOVE_TARGET_NOT_FOUND',
      message: `Target ids were not found in canvas '${seeded.canvas.name}': missing-id.`,
      canvasId: seeded.canvas.id,
      canvasNameQuery: null,
    });

    const ambiguousCanvas = await context.runCanvasCli(['move', '--canvas-name', 'design board', '--id', rectA.id, '--relative', '--x', '1', '--y', '1', '--json']);
    expectExitCode(ambiguousCanvas, 1);
    expect(ambiguousCanvas.stdout).toBe('');
    expect(JSON.parse(ambiguousCanvas.stderr)).toMatchObject({
      ok: false,
      command: 'canvas.move',
      code: 'CANVAS_SELECTOR_AMBIGUOUS',
      message: "Canvas name query 'design board' matched 2 canvases. Pass --canvas <id> instead.",
      canvasId: null,
      canvasNameQuery: 'design board',
    });

    const invalidAbsolute = await context.runCanvasCli(['move', '--canvas', seeded.canvas.id, '--id', rectA.id, '--id', rectB.id, '--absolute', '--x', '10', '--y', '20', '--json']);
    expectExitCode(invalidAbsolute, 1);
    expect(invalidAbsolute.stdout).toBe('');
    expect(JSON.parse(invalidAbsolute.stderr)).toMatchObject({
      ok: false,
      command: 'canvas.move',
      code: 'CANVAS_MOVE_ABSOLUTE_REQUIRES_SINGLE_TARGET',
      message: 'Absolute move currently requires exactly one target id.',
      canvasId: seeded.canvas.id,
      canvasNameQuery: null,
    });
  });
});
