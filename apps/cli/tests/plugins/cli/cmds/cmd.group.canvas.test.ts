import { afterEach, describe, expect, test } from 'bun:test';
import { createCliTestContext, createGroup, createRectElement, expectExitCode, expectNoStderr, parseJsonStdout, type TCliTestContext } from '../../../cli/harness';

type TGroupJson = {
  ok: true;
  command: 'canvas.group';
  matchedCount: number;
  matchedIds: string[];
  group: {
    id: string;
    parentGroupId: string | null;
    childIds: string[];
  };
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

describe('canvas CLI group', () => {
  test('shows command-specific help instead of generic canvas help', async () => {
    const context = await createContext();

    const result = await context.runVibecanvasCli(['canvas', 'group', '--help']);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(result.stdout).toContain('Usage: vibecanvas canvas group [options]');
    expect(result.stdout).toContain('Group explicit element ids inside one selected canvas.');
    expect(result.stdout).not.toContain('Usage: vibecanvas canvas <command> [options]');
  });

  test('groups explicit sibling element ids and returns machine-readable success output', async () => {
    const context = await createContext();
    const rectA = createRectElement({ id: 'rect-a', zIndex: 'a0', x: 10, y: 20 });
    const rectB = createRectElement({ id: 'rect-b', zIndex: 'a1', x: 120, y: 50 });
    const keep = createRectElement({ id: 'rect-keep', zIndex: 'a2', x: 300, y: 400 });
    const seeded = await context.seedCanvasFixture({ name: 'group-canvas', elements: { [rectA.id]: rectA, [rectB.id]: rectB, [keep.id]: keep } });

    const result = await context.runCanvasCli(['group', '--canvas', seeded.canvas.id, '--id', rectB.id, '--id', rectA.id, '--json']);

    expectExitCode(result, 0);
    expectNoStderr(result);
    const payload = parseJsonStdout<TGroupJson>(result);
    expect(payload).toMatchObject({
      ok: true,
      command: 'canvas.group',
      matchedCount: 2,
      matchedIds: ['rect-a', 'rect-b'],
      group: {
        parentGroupId: null,
        childIds: ['rect-a', 'rect-b'],
      },
    });
    expect(typeof payload.group.id).toBe('string');
    expect(payload.group.id.length).toBeGreaterThan(0);

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.groups[payload.group.id]).toBeDefined();
    expect(doc.groups[payload.group.id]?.parentGroupId ?? null).toBeNull();
    expect(doc.elements[rectA.id]?.parentGroupId).toBe(payload.group.id);
    expect(doc.elements[rectB.id]?.parentGroupId).toBe(payload.group.id);
    expect(doc.elements[keep.id]?.parentGroupId ?? null).toBeNull();
  });

  test('fails clearly when ids do not share the same parent group', async () => {
    const context = await createContext();
    const parent = createGroup({ id: 'group-parent' });
    const nested = createRectElement({ id: 'rect-nested', parentGroupId: parent.id });
    const topLevel = createRectElement({ id: 'rect-top' });
    const seeded = await context.seedCanvasFixture({ name: 'group-parent-mismatch', groups: { [parent.id]: parent }, elements: { [nested.id]: nested, [topLevel.id]: topLevel } });

    const result = await context.runCanvasCli(['group', '--canvas', seeded.canvas.id, '--id', nested.id, '--id', topLevel.id, '--json']);

    expectExitCode(result, 1);
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      command: 'canvas.group',
      code: 'CANVAS_GROUP_PARENT_MISMATCH',
      canvasId: seeded.canvas.id,
    });
  });
});
