import { describe, expect, test } from 'bun:test';
import { executeCanvasList, renderCanvasListText } from '../src';
import { createMockContext } from './test-helpers';

describe('executeCanvasList', () => {
  test('returns deterministic canvas inventory ordering', async () => {
    const ctx = createMockContext({
      rows: [
        { id: 'b', name: 'Beta', created_at: '2024-01-03T00:00:00.000Z', automerge_url: 'automerge:b' },
        { id: 'a2', name: 'Alpha', created_at: '2024-01-01T00:00:00.000Z', automerge_url: 'automerge:a2' },
        { id: 'a1', name: 'Alpha', created_at: '2024-01-01T00:00:00.000Z', automerge_url: 'automerge:a1' },
      ],
      docs: {},
    });

    const result = await executeCanvasList(ctx);

    expect(result.ok).toBe(true);
    expect(result.count).toBe(3);
    expect(result.canvases.map((canvas) => canvas.id)).toEqual(['a1', 'a2', 'b']);
    expect(renderCanvasListText(result)).toContain('Canvas inventory: 3 canvases');
  });

  test('renders empty inventory cleanly', async () => {
    const ctx = createMockContext({
      rows: [],
      docs: {},
    });

    const result = await executeCanvasList(ctx);

    expect(result.count).toBe(0);
    expect(renderCanvasListText(result)).toBe('Canvas inventory: 0 canvases\n');
  });
});
