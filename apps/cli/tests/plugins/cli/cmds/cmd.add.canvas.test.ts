import { afterEach, describe, expect, test } from 'bun:test';
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

describe('canvas CLI add', () => {
  test('ignores agent-supplied ids and generates fresh ids', async () => {
    const context = await createContext();
    const seeded = await context.seedCanvasFixture({ name: 'add-ignore-id' });

    const result = await context.runCanvasCli(['add', '--canvas', seeded.canvas.id, '--element', '{"id":"line-1","type":"rect","x":10,"y":20}', '--json']);

    expectExitCode(result, 0);
    expectNoStderr(result);
    const payload = parseJsonStdout<TAddJson>(result);
    expect(payload).toMatchObject({ ok: true, command: 'canvas.add', addedCount: 1 });
    expect(payload.addedIds).toHaveLength(1);
    expect(payload.addedIds[0]).not.toBe('line-1');

    expect(payload.addedIds[0]).toMatch(/^[0-9a-f-]{36}$/i);
  });

  test('supports shorthand add flags and schema help output', async () => {
    const context = await createContext();
    const seeded = await context.seedCanvasFixture({ name: 'add-shorthand' });

    const addResult = await context.runCanvasCli(['add', '--canvas', seeded.canvas.id, '--rect', '10,20,120,80', '--arrow', '130,60,220,60', '--json']);
    expectExitCode(addResult, 0);
    expectNoStderr(addResult);
    expect(parseJsonStdout<TAddJson>(addResult)).toMatchObject({ ok: true, command: 'canvas.add', addedCount: 2 });

    const helpResult = await context.runCanvasCli(['add', '--help', '--schema']);
    expectExitCode(helpResult, 0);
    expectNoStderr(helpResult);
    expect(helpResult.stdout).toContain('export type TRectData = {');
    expect(helpResult.stdout).toContain('export type TArrowData =');
    expect(helpResult.stdout).toContain('packages/service-automerge/src/types/canvas-doc.ts');

    const filteredHelpResult = await context.runCanvasCli(['add', '--help', '--schema', 'rect']);
    expectExitCode(filteredHelpResult, 0);
    expectNoStderr(filteredHelpResult);
    expect(filteredHelpResult.stdout).toContain('Schema filter:');
    expect(filteredHelpResult.stdout).toContain('rect');
    expect(filteredHelpResult.stdout).toContain('export type TRectData = {');
    expect(filteredHelpResult.stdout).not.toContain('export type TArrowData =');
  });

  test('rejects malformed shorthand payloads with tighter grammar', async () => {
    const context = await createContext();
    const seeded = await context.seedCanvasFixture({ name: 'add-bad-shorthand' });

    const badRect = await context.runCanvasCli(['add', '--canvas', seeded.canvas.id, '--rect', '10,,120,80', '--json']);
    expectExitCode(badRect, 1);
    expect(badRect.stdout).toBe('');
    expect(JSON.parse(badRect.stderr)).toMatchObject({
      ok: false,
      command: 'canvas.add',
      code: 'CANVAS_ADD_SHORTHAND_INVALID',
      hint: 'Use strict shorthand grammar only: rect x,y,w,h; ellipse x,y,rx,ry; diamond x,y,w,h; text x,y,text; line/arrow x,y,x2,y2.',
    });

    const badText = await context.runCanvasCli(['add', '--canvas', seeded.canvas.id, '--text', '40,20,', '--json']);
    expectExitCode(badText, 1);
    expect(badText.stdout).toBe('');
    expect(JSON.parse(badText.stderr)).toMatchObject({
      ok: false,
      command: 'canvas.add',
      code: 'CANVAS_ADD_SHORTHAND_INVALID',
      message: '--text shorthand must be exactly x,y,text with non-empty single-line text.',
    });
  });
});
