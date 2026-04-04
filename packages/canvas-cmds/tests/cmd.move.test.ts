import { describe, expect, test } from 'bun:test';
import { CanvasCmdError, executeCanvasMove, renderCanvasMoveText } from '../src';
import { createCanvasDoc, createGroup, createMockContext, createRectElement } from './test-helpers';

describe('executeCanvasMove', () => {
  test('moves a single element relatively and waits for mutation visibility', async () => {
    const rect = createRectElement({ id: 'rect-1', x: 10, y: 20 });
    const doc = createCanvasDoc({
      name: 'Move Canvas',
      elements: { [rect.id]: rect },
    });

    const ctx = createMockContext({
      rows: [{ id: 'canvas-1', name: 'Move Canvas', created_at: '2024-01-01T00:00:00.000Z', automerge_url: 'automerge:canvas-1' }],
      docs: { 'automerge:canvas-1': doc },
    });

    const result = await executeCanvasMove(ctx, {
      canvasId: 'canvas-1',
      canvasNameQuery: null,
      ids: ['rect-1'],
      mode: 'relative',
      x: 15,
      y: -5,
    });

    expect(result.delta).toEqual({ dx: 15, dy: -5 });
    expect(result.changedIds).toEqual(['rect-1']);
    expect(doc.elements['rect-1']?.x).toBe(25);
    expect(doc.elements['rect-1']?.y).toBe(15);
    expect(ctx.waitCalls).toHaveLength(1);
    expect(renderCanvasMoveText(result)).toContain('Moved 1 element');
  });

  test('moves group descendants when a group id is targeted', async () => {
    const group = createGroup({ id: 'group-1' });
    const rectA = createRectElement({ id: 'rect-a', parentGroupId: 'group-1', x: 10, y: 20 });
    const rectB = createRectElement({ id: 'rect-b', parentGroupId: 'group-1', x: 50, y: 60 });
    const doc = createCanvasDoc({
      name: 'Grouped',
      groups: { [group.id]: group },
      elements: {
        [rectA.id]: rectA,
        [rectB.id]: rectB,
      },
    });

    const ctx = createMockContext({
      rows: [{ id: 'canvas-1', name: 'Grouped', created_at: '2024-01-01T00:00:00.000Z', automerge_url: 'automerge:canvas-1' }],
      docs: { 'automerge:canvas-1': doc },
      source: 'live',
    });

    const result = await executeCanvasMove(ctx, {
      canvasId: 'canvas-1',
      canvasNameQuery: null,
      ids: ['group-1'],
      mode: 'relative',
      x: 5,
      y: 7,
    });

    expect(result.changedIds).toEqual(['rect-a', 'rect-b']);
    expect(doc.elements['rect-a']?.x).toBe(15);
    expect(doc.elements['rect-a']?.y).toBe(27);
    expect(doc.elements['rect-b']?.x).toBe(55);
    expect(doc.elements['rect-b']?.y).toBe(67);
    expect(ctx.waitCalls[0]?.source).toBe('live');
  });

  test('fails absolute mode when more than one target id is passed', async () => {
    const rectA = createRectElement({ id: 'rect-a' });
    const rectB = createRectElement({ id: 'rect-b', x: 100 });
    const doc = createCanvasDoc({
      name: 'Absolute Canvas',
      elements: {
        [rectA.id]: rectA,
        [rectB.id]: rectB,
      },
    });

    const ctx = createMockContext({
      rows: [{ id: 'canvas-1', name: 'Absolute Canvas', created_at: '2024-01-01T00:00:00.000Z', automerge_url: 'automerge:canvas-1' }],
      docs: { 'automerge:canvas-1': doc },
    });

    await expect(executeCanvasMove(ctx, {
      canvasId: 'canvas-1',
      canvasNameQuery: null,
      ids: ['rect-a', 'rect-b'],
      mode: 'absolute',
      x: 10,
      y: 20,
    })).rejects.toBeInstanceOf(CanvasCmdError);

    await expect(executeCanvasMove(ctx, {
      canvasId: 'canvas-1',
      canvasNameQuery: null,
      ids: ['rect-a', 'rect-b'],
      mode: 'absolute',
      x: 10,
      y: 20,
    })).rejects.toMatchObject({
      details: {
        code: 'CANVAS_MOVE_ABSOLUTE_REQUIRES_SINGLE_TARGET',
      },
    });
  });
});
