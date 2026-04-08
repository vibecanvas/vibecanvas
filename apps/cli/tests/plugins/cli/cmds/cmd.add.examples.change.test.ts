import { writeFile } from 'node:fs/promises';
import { afterEach, describe, expect, test } from 'bun:test';
import {
  CANVAS_ADD_EXAMPLE_FILE_PAYLOAD,
  CANVAS_ADD_EXAMPLE_INLINE_RECT_PAYLOAD,
  CANVAS_ADD_EXAMPLE_INLINE_TEXT_PAYLOAD,
} from '../../../../src/plugins/cli/canvas-command.examples';
import { createCliTestContext, expectExitCode, expectNoStderr, parseJsonStdout, type TCliTestContext } from '../harness';

type TAddJson = {
  ok: true;
  command: 'canvas.add';
  addedCount: number;
  addedIds: string[];
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

describe('canvas add help examples stay executable', () => {
  test('inline json examples add a rect and text without agent-supplied ids', async () => {
    const context = await createContext();
    const seeded = await context.seedCanvasFixture({ name: 'add-help-inline' });

    const rectResult = await context.runCanvasCli(['add', '--canvas', seeded.canvas.id, '--element', JSON.stringify(CANVAS_ADD_EXAMPLE_INLINE_RECT_PAYLOAD), '--json']);
    expectExitCode(rectResult, 0);
    expectNoStderr(rectResult);
    expect(parseJsonStdout<TAddJson>(rectResult)).toMatchObject({ ok: true, command: 'canvas.add', addedCount: 1 });

    const textResult = await context.runCanvasCli(['add', '--canvas', seeded.canvas.id, '--element', JSON.stringify(CANVAS_ADD_EXAMPLE_INLINE_TEXT_PAYLOAD), '--json']);
    expectExitCode(textResult, 0);
    expectNoStderr(textResult);
    expect(parseJsonStdout<TAddJson>(textResult)).toMatchObject({ ok: true, command: 'canvas.add', addedCount: 1 });

    const rectPayload = parseJsonStdout<TAddJson>(rectResult);
    const textPayload = parseJsonStdout<TAddJson>(textResult);
    expect(rectPayload.addedIds[0]).toMatch(/^[0-9a-f-]{36}$/i);
    expect(textPayload.addedIds[0]).toMatch(/^[0-9a-f-]{36}$/i);
    expect(rectPayload.addedIds[0]).not.toBe(textPayload.addedIds[0]);
  });

  test('file and shorthand examples stay executable', async () => {
    const context = await createContext();
    const seeded = await context.seedCanvasFixture({ name: 'add-help-file' });
    const filePath = `${context.tempRoot}/add-help-elements.json`;
    await writeFile(filePath, JSON.stringify(CANVAS_ADD_EXAMPLE_FILE_PAYLOAD), 'utf8');

    const fileResult = await context.runCanvasCli(['add', '--canvas', seeded.canvas.id, '--elements-file', filePath, '--json']);
    expectExitCode(fileResult, 0);
    expectNoStderr(fileResult);
    expect(parseJsonStdout<TAddJson>(fileResult)).toMatchObject({ ok: true, command: 'canvas.add', addedCount: 2 });

    const shorthandRect = await context.runCanvasCli(['add', '--canvas', seeded.canvas.id, '--rect', '40,20,160,90', '--json']);
    expectExitCode(shorthandRect, 0);
    expectNoStderr(shorthandRect);
    expect(parseJsonStdout<TAddJson>(shorthandRect)).toMatchObject({ ok: true, command: 'canvas.add', addedCount: 1 });

    const shorthandText = await context.runCanvasCli(['add', '--canvas', seeded.canvas.id, '--text', '240,32,hello', '--json']);
    expectExitCode(shorthandText, 0);
    expectNoStderr(shorthandText);
    expect(parseJsonStdout<TAddJson>(shorthandText)).toMatchObject({ ok: true, command: 'canvas.add', addedCount: 1 });

    const filePayload = parseJsonStdout<TAddJson>(fileResult);
    const shorthandRectPayload = parseJsonStdout<TAddJson>(shorthandRect);
    const shorthandTextPayload = parseJsonStdout<TAddJson>(shorthandText);
    expect(filePayload.addedIds).toHaveLength(2);
    expect(shorthandRectPayload.addedIds).toHaveLength(1);
    expect(shorthandTextPayload.addedIds).toHaveLength(1);
  });
});
