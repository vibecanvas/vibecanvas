import { describe, expect, test } from 'bun:test';
import { CanvasCmdError, executeCanvasQuery, renderCanvasQueryText, resolveSelectorEnvelope } from '../src';
import { createCanvasDoc, createGroup, createMockContext, createRectElement, createTextElement } from './test-helpers';

describe('executeCanvasQuery', () => {
  test('queries by structured selector and returns matching element payloads', async () => {
    const redRect = createRectElement({ id: 'rect-red' });
    const blueRect = createRectElement({
      id: 'rect-blue',
      x: 300,
      style: { backgroundColor: '#0000ff', strokeColor: '#111111', strokeWidth: 2, opacity: 1 },
    });
    const doc = createCanvasDoc({
      name: 'Design Board',
      elements: {
        [redRect.id]: redRect,
        [blueRect.id]: blueRect,
      },
    });

    const ctx = createMockContext({
      rows: [{ id: 'canvas-1', name: 'Design Board', created_at: '2024-01-01T00:00:00.000Z', automerge_url: 'automerge:canvas-1' }],
      docs: { 'automerge:canvas-1': doc },
    });

    const selector = resolveSelectorEnvelope({
      values: { type: ['rect'], style: ['backgroundColor=#ff0000'] },
      canvasId: 'canvas-1',
      canvasNameQuery: null,
      command: 'canvas.query',
      fail: (error) => {
        throw new Error(error.message);
      },
    });

    const result = await executeCanvasQuery(ctx, {
      selector,
      output: 'summary',
    });

    expect(result.ok).toBe(true);
    expect(result.count).toBe(1);
    expect(result.matches[0]?.metadata.id).toBe('rect-red');
    expect(renderCanvasQueryText(result)).toContain('Query matched 1 target');
    expect(renderCanvasQueryText(result)).toContain('element rect-red [rect]');
  });

  test('queries subtree selectors and can omit data/style payloads', async () => {
    const rootGroup = createGroup({ id: 'group-root' });
    const nestedGroup = createGroup({ id: 'group-nested', parentGroupId: 'group-root' });
    const childRect = createRectElement({ id: 'rect-child', parentGroupId: 'group-nested' });
    const topLevelText = createTextElement({ id: 'text-top' });
    const doc = createCanvasDoc({
      name: 'Scene',
      groups: {
        [rootGroup.id]: rootGroup,
        [nestedGroup.id]: nestedGroup,
      },
      elements: {
        [childRect.id]: childRect,
        [topLevelText.id]: topLevelText,
      },
    });

    const ctx = createMockContext({
      rows: [{ id: 'canvas-1', name: 'Scene', created_at: '2024-01-01T00:00:00.000Z', automerge_url: 'automerge:canvas-1' }],
      docs: { 'automerge:canvas-1': doc },
    });

    const selector = resolveSelectorEnvelope({
      values: { where: 'subtree=group-root&kind=element' },
      canvasId: null,
      canvasNameQuery: 'scene',
      command: 'canvas.query',
      fail: (error) => {
        throw new Error(error.message);
      },
    });

    const result = await executeCanvasQuery(ctx, {
      selector,
      output: 'summary',
      omitData: true,
      omitStyle: true,
    });

    expect(result.count).toBe(1);
    expect(result.matches[0]?.metadata.id).toBe('rect-child');
    expect(result.matches[0]?.payload).not.toHaveProperty('data');
    expect(result.matches[0]?.payload).not.toHaveProperty('style');
  });

  test('uses the selected canvas row name when subtree validation runs against a malformed doc name', async () => {
    const doc = {
      ...createCanvasDoc({ name: 'ignored-doc-name' }),
      name: undefined,
    } as unknown as ReturnType<typeof createCanvasDoc>;
    const ctx = createMockContext({
      rows: [{ id: 'canvas-1', name: 'hello', created_at: '2024-01-01T00:00:00.000Z', automerge_url: 'automerge:canvas-1' }],
      docs: { 'automerge:canvas-1': doc },
    });

    const selector = resolveSelectorEnvelope({
      values: { subtree: 'missing-group' },
      canvasId: null,
      canvasNameQuery: 'hello',
      command: 'canvas.query',
      fail: (error) => {
        throw new Error(error.message);
      },
    });

    await expect(executeCanvasQuery(ctx, { selector })).rejects.toMatchObject({
      details: {
        code: 'CANVAS_QUERY_SUBTREE_NOT_FOUND',
        message: "Subtree root 'missing-group' was not found in canvas 'hello'.",
      },
    } satisfies Partial<CanvasCmdError>);
  });
});
