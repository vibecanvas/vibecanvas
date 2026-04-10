import { afterEach, describe, expect, test } from 'bun:test';
import { createCliTestContext, createGroup, createRectElement, expectExitCode, expectNoStderr, parseJsonStdout, type TCliTestContext } from '../harness';

type TUngroupJson = {
  ok: true;
  command: 'canvas.ungroup';
  matchedCount: number;
  matchedIds: string[];
  removedGroupCount: number;
  removedGroupIds: string[];
  releasedChildCount: number;
  releasedChildIds: string[];
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

describe('canvas CLI ungroup', () => {
  test('shows command-specific help instead of generic canvas help', async () => {
    const context = await createContext();

    const result = await context.runVibecanvasCli(['canvas', 'ungroup', '--help']);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(result.stdout).toContain('Usage: vibecanvas canvas ungroup [options]');
    expect(result.stdout).toContain('Ungroup explicit group ids inside one selected canvas.');
    expect(result.stdout).not.toContain('Usage: vibecanvas canvas <command> [options]');
  });

  test('ungroups one group and reparents direct children to the removed group parent', async () => {
    const context = await createContext();
    const root = createGroup({ id: 'group-root' });
    const child = createGroup({ id: 'group-child', parentGroupId: root.id });
    const inside = createRectElement({ id: 'rect-inside', parentGroupId: child.id });
    const siblingGroup = createGroup({ id: 'group-sibling', parentGroupId: child.id });
    const nestedInSibling = createRectElement({ id: 'rect-nested-sibling', parentGroupId: siblingGroup.id });
    const seeded = await context.seedCanvasFixture({
      name: 'ungroup-canvas',
      groups: { [root.id]: root, [child.id]: child, [siblingGroup.id]: siblingGroup },
      elements: { [inside.id]: inside, [nestedInSibling.id]: nestedInSibling },
    });

    const result = await context.runCanvasCli(['ungroup', '--canvas', seeded.canvas.id, '--id', child.id, '--json']);

    expectExitCode(result, 0);
    expectNoStderr(result);
    const payload = parseJsonStdout<TUngroupJson>(result);
    expect(payload).toMatchObject({
      ok: true,
      command: 'canvas.ungroup',
      matchedCount: 1,
      matchedIds: ['group-child'],
      removedGroupCount: 1,
      removedGroupIds: ['group-child'],
      releasedChildCount: 1,
      releasedChildIds: ['rect-inside'],
    });

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.groups[child.id]).toBeUndefined();
    expect(doc.elements[inside.id]?.parentGroupId).toBe(root.id);
    expect(doc.groups[siblingGroup.id]?.parentGroupId).toBe(root.id);
    expect(doc.elements[nestedInSibling.id]?.parentGroupId).toBe(siblingGroup.id);
  });

  test('fails clearly when an element id is passed to ungroup', async () => {
    const context = await createContext();
    const rect = createRectElement({ id: 'rect-only' });
    const seeded = await context.seedCanvasFixture({ name: 'ungroup-invalid-kind', elements: { [rect.id]: rect } });

    const result = await context.runCanvasCli(['ungroup', '--canvas', seeded.canvas.id, '--id', rect.id, '--json']);

    expectExitCode(result, 1);
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      command: 'canvas.ungroup',
      code: 'CANVAS_UNGROUP_TARGET_KIND_INVALID',
      canvasId: seeded.canvas.id,
    });
  });

  test('dry-run previews ungroup without removing the group', async () => {
    const context = await createContext();
    const root = createGroup({ id: 'group-root-dry' });
    const child = createGroup({ id: 'group-child-dry', parentGroupId: root.id });
    const inside = createRectElement({ id: 'rect-inside-dry', parentGroupId: child.id });
    const seeded = await context.seedCanvasFixture({ name: 'ungroup-dry-run', groups: { [root.id]: root, [child.id]: child }, elements: { [inside.id]: inside } });

    const result = await context.runCanvasCli(['ungroup', '--canvas', seeded.canvas.id, '--id', child.id, '--dry-run', '--json']);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(parseJsonStdout<TUngroupJson & { dryRun: boolean }>(result)).toMatchObject({ ok: true, command: 'canvas.ungroup', dryRun: true, removedGroupIds: ['group-child-dry'] });

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.groups[child.id]).toBeDefined();
    expect(doc.elements[inside.id]?.parentGroupId).toBe(child.id);
  });

});
