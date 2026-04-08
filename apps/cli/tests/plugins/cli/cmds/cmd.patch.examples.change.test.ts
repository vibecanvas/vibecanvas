import { afterEach, describe, expect, test } from 'bun:test';
import {
  CANVAS_PATCH_EXAMPLE_GROUP_PAYLOAD,
  CANVAS_PATCH_EXAMPLE_MOVE_ELEMENT_PAYLOAD,
  CANVAS_PATCH_EXAMPLE_STYLE_ELEMENT_PAYLOAD,
} from '../../../../src/plugins/cli/canvas-command.examples';
import { createCliTestContext, createGroup, createRectElement, expectExitCode, expectNoStderr, parseJsonStdout, type TCliTestContext } from '../harness';

type TPatchJson = {
  ok: true;
  command: 'canvas.patch';
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

describe('canvas patch help examples stay executable', () => {
  test('element patch examples move and restyle a rect', async () => {
    const context = await createContext();
    const rect = createRectElement({ id: 'rect-1', x: 40, y: 80, style: { backgroundColor: '#ffffff', strokeColor: '#111111', strokeWidth: 1, opacity: 1 } });
    const seeded = await context.seedCanvasFixture({ name: 'patch-help-element', elements: { [rect.id]: rect } });

    const moveResult = await context.runCanvasCli(['patch', '--canvas', seeded.canvas.id, '--id', rect.id, '--patch', JSON.stringify(CANVAS_PATCH_EXAMPLE_MOVE_ELEMENT_PAYLOAD), '--json']);
    expectExitCode(moveResult, 0);
    expectNoStderr(moveResult);
    expect(parseJsonStdout<TPatchJson>(moveResult)).toMatchObject({ ok: true, command: 'canvas.patch', changedCount: 1, changedIds: ['rect-1'] });

    const styleResult = await context.runCanvasCli(['patch', '--canvas', seeded.canvas.id, '--id', rect.id, '--patch', JSON.stringify(CANVAS_PATCH_EXAMPLE_STYLE_ELEMENT_PAYLOAD), '--json']);
    expectExitCode(styleResult, 0);
    expectNoStderr(styleResult);
    expect(parseJsonStdout<TPatchJson>(styleResult)).toMatchObject({ ok: true, command: 'canvas.patch', changedCount: 1, changedIds: ['rect-1'] });

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.elements[rect.id]?.x).toBe(55);
    expect(doc.elements[rect.id]?.style.backgroundColor).toBe('#ff0000');
  });

  test('group patch example locks a group', async () => {
    const context = await createContext();
    const group = createGroup({ id: 'group-1', locked: false });
    const seeded = await context.seedCanvasFixture({ name: 'patch-help-group', groups: { [group.id]: group } });

    const result = await context.runCanvasCli(['patch', '--canvas', seeded.canvas.id, '--id', group.id, '--patch', JSON.stringify(CANVAS_PATCH_EXAMPLE_GROUP_PAYLOAD), '--json']);
    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(parseJsonStdout<TPatchJson>(result)).toMatchObject({ ok: true, command: 'canvas.patch', changedCount: 1, changedIds: ['group-1'] });

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.groups[group.id]?.locked).toBe(true);
  });
});
