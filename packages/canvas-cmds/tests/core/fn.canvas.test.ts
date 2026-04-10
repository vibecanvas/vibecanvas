import { describe, expect, test } from 'bun:test';
import { fnResolveCanvasSelection } from '../../src/core/fn.canvas';

describe('fnResolveCanvasSelection', () => {
  test('reports every matching row when ambiguous names collide', () => {
    const rows = [
      { id: 'canvas-a', name: 'Same Name', automerge_url: 'automerge:a', created_at: new Date('2024-01-01T00:00:00.000Z') },
      { id: 'canvas-b', name: 'Same Name', automerge_url: 'automerge:b', created_at: new Date('2024-01-02T00:00:00.000Z') },
    ];

    expect(() => fnResolveCanvasSelection({
      rows,
      selector: { canvasId: null, canvasNameQuery: 'Same Name' },
      command: 'canvas.query',
      actionLabel: 'Query',
    })).toThrow(expect.objectContaining({
      ok: false,
      command: 'canvas.query',
      code: 'CANVAS_SELECTOR_AMBIGUOUS',
      canvasId: null,
      canvasNameQuery: 'Same Name',
      matches: [
        { id: 'canvas-a', name: 'Same Name' },
        { id: 'canvas-b', name: 'Same Name' },
      ],
    }));
  });
});
