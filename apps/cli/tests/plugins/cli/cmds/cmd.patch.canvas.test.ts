import { writeFile } from 'node:fs/promises';
import { afterEach, describe, expect, test } from 'bun:test';
import { createCliTestContext, createGroup, createRectElement, createTextElement, expectExitCode, expectNoStderr, parseJsonStdout, type TCliTestContext } from '../../../cli/harness';

type TPatchJson = {
  ok: true;
  command: 'canvas.patch';
  patch: Record<string, unknown>;
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

describe('canvas CLI patch', () => {
  test('patches one explicit element id from inline json and reports stable changed-count json output', async () => {
    const context = await createContext();
    const rect = createRectElement({ id: 'rect-1', x: 40, y: 80, updatedAt: 100, style: { backgroundColor: '#ffffff', strokeColor: '#111111', strokeWidth: 1, opacity: 1 } });
    const other = createRectElement({ id: 'rect-2', x: 400, y: 500, updatedAt: 100 });
    const seeded = await context.seedCanvasFixture({ name: 'patch-inline-canvas', elements: { [rect.id]: rect, [other.id]: other } });

    const result = await context.runCanvasCli(['patch', '--canvas', seeded.canvas.id, '--id', rect.id, '--patch', '{"element":{"x":55,"style":{"backgroundColor":"#ff0000"}}}', '--json']);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(parseJsonStdout<TPatchJson>(result)).toMatchObject({
      ok: true,
      command: 'canvas.patch',
      matchedCount: 1,
      matchedIds: ['rect-1'],
      changedCount: 1,
      changedIds: ['rect-1'],
      patch: {
        element: {
          x: 55,
          style: { backgroundColor: '#ff0000' },
        },
      },
    });

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.elements[rect.id]?.x).toBe(55);
    expect(doc.elements[rect.id]?.style.backgroundColor).toBe('#ff0000');
    expect(doc.elements[rect.id]?.updatedAt).toBeGreaterThan(100);
    expect(doc.elements[other.id]?.x).toBe(400);
    expect(doc.elements[other.id]?.style.backgroundColor).toBe('#ffffff');
  });

  test('reads a patch payload from file and only patches the targeted id', async () => {
    const context = await createContext();
    const text = createTextElement({ id: 'text-1', updatedAt: 10 });
    const rect = createRectElement({ id: 'rect-1', updatedAt: 20 });
    const seeded = await context.seedCanvasFixture({ name: 'patch-file-canvas', elements: { [text.id]: text, [rect.id]: rect } });
    const patchPath = `${context.tempRoot}/text.patch.json`;

    await writeFile(patchPath, JSON.stringify({ element: { data: { text: 'patched from file', originalText: 'patched from file' } } }), 'utf8');

    const result = await context.runCanvasCli(['patch', '--canvas', seeded.canvas.id, '--id', text.id, '--patch-file', patchPath, '--json']);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(parseJsonStdout<TPatchJson>(result)).toMatchObject({
      ok: true,
      command: 'canvas.patch',
      matchedCount: 1,
      matchedIds: ['text-1'],
      changedCount: 1,
      changedIds: ['text-1'],
    });

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.elements[text.id]?.data.type).toBe('text');
    if (doc.elements[text.id]?.data.type !== 'text') throw new Error('expected text element');
    expect(doc.elements[text.id].data.text).toBe('patched from file');
    expect(doc.elements[text.id].data.originalText).toBe('patched from file');
    expect(doc.elements[rect.id]?.data.type).toBe('rect');
  });

  test('reads a patch payload from stdin and supports group updates', async () => {
    const context = await createContext();
    const group = createGroup({ id: 'group-1', locked: false });
    const seeded = await context.seedCanvasFixture({ name: 'patch-stdin-canvas', groups: { [group.id]: group } });

    const result = await context.runProcess({
      cmd: ['bun', 'run', 'apps/cli/src/main.ts', 'canvas', 'patch', '--canvas', seeded.canvas.id, '--id', group.id, '--patch-stdin', '--json', '--db', context.dbPath],
      stdinText: JSON.stringify({ group: { locked: true } }),
    });

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(parseJsonStdout<TPatchJson>(result)).toMatchObject({
      ok: true,
      command: 'canvas.patch',
      matchedCount: 1,
      matchedIds: ['group-1'],
      changedCount: 1,
      changedIds: ['group-1'],
      patch: { group: { locked: true } },
    });

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.groups[group.id]?.locked).toBe(true);
  });

  test('reports zero changed ids when the patch is a no-op', async () => {
    const context = await createContext();
    const rect = createRectElement({ id: 'rect-1', locked: false, updatedAt: 123 });
    const seeded = await context.seedCanvasFixture({ name: 'patch-noop-canvas', elements: { [rect.id]: rect } });

    const result = await context.runCanvasCli(['patch', '--canvas', seeded.canvas.id, '--id', rect.id, '--patch', '{"element":{"locked":false}}', '--json']);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(parseJsonStdout<TPatchJson>(result)).toMatchObject({
      ok: true,
      command: 'canvas.patch',
      matchedCount: 1,
      matchedIds: ['rect-1'],
      changedCount: 0,
      changedIds: [],
    });

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.elements[rect.id]?.locked).toBe(false);
    expect(doc.elements[rect.id]?.updatedAt).toBe(123);
  });

  test('fails clearly on malformed payloads and invalid field/type combinations', async () => {
    const context = await createContext();
    const rect = createRectElement({ id: 'rect-1' });
    const seeded = await context.seedCanvasFixture({ name: 'patch-invalid-canvas', elements: { [rect.id]: rect } });

    const malformed = await context.runCanvasCli(['patch', '--canvas', seeded.canvas.id, '--id', rect.id, '--patch', '{not-json}', '--json']);
    expectExitCode(malformed, 1);
    expect(malformed.stdout).toBe('');
    expect(JSON.parse(malformed.stderr)).toMatchObject({
      ok: false,
      command: 'canvas.patch',
      code: 'CANVAS_PATCH_PAYLOAD_INVALID',
    });

    const invalidField = await context.runCanvasCli(['patch', '--canvas', seeded.canvas.id, '--id', rect.id, '--patch', '{"element":{"data":{"text":"wrong"}}}', '--json']);
    expectExitCode(invalidField, 1);
    expect(invalidField.stdout).toBe('');
    expect(JSON.parse(invalidField.stderr)).toMatchObject({
      ok: false,
      command: 'canvas.patch',
      code: 'CANVAS_PATCH_PAYLOAD_INVALID',
      message: "Patch field 'element.data.text' is invalid for element 'rect-1' of type 'rect'.",
    });
  });
});
