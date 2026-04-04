import { describe, expect, test } from 'bun:test';
import { CanvasCmdError, executeCanvasPatch, renderCanvasPatchText } from '../src';
import { createCanvasDoc, createGroup, createMockContext, createRectElement, createTextElement } from './test-helpers';

describe('executeCanvasPatch', () => {
  test('patches one explicit element id and reports exactly what changed', async () => {
    const rect = createRectElement({ id: 'rect-1', x: 10, y: 20, updatedAt: 100, style: { backgroundColor: '#ffffff', strokeColor: '#222222', strokeWidth: 2, opacity: 1 } });
    const other = createRectElement({ id: 'rect-2', x: 200, y: 300, updatedAt: 100 });
    const doc = createCanvasDoc({
      name: 'Patch Canvas',
      elements: {
        [rect.id]: rect,
        [other.id]: other,
      },
    });

    const ctx = createMockContext({
      rows: [{ id: 'canvas-1', name: 'Patch Canvas', created_at: '2024-01-01T00:00:00.000Z', automerge_url: 'automerge:canvas-1' }],
      docs: { 'automerge:canvas-1': doc },
    });

    const result = await executeCanvasPatch(ctx, {
      canvasId: 'canvas-1',
      canvasNameQuery: null,
      ids: ['rect-1'],
      patch: {
        element: {
          x: 33,
          style: { backgroundColor: '#ff0000' },
        },
      },
    });

    expect(result.matchedIds).toEqual(['rect-1']);
    expect(result.changedIds).toEqual(['rect-1']);
    expect(result.changedCount).toBe(1);
    expect(doc.elements['rect-1']?.x).toBe(33);
    expect(doc.elements['rect-1']?.style.backgroundColor).toBe('#ff0000');
    expect(doc.elements['rect-1']?.updatedAt).toBeGreaterThan(100);
    expect(doc.elements['rect-2']?.x).toBe(200);
    expect(renderCanvasPatchText(result)).toContain('Patched 1 target');
    expect(ctx.waitCalls).toHaveLength(1);
  });

  test('patches groups with the group branch and reports no-op changed counts when values are unchanged', async () => {
    const group = createGroup({ id: 'group-1', locked: false, zIndex: 'a0' });
    const doc = createCanvasDoc({
      name: 'Group Patch Canvas',
      groups: { [group.id]: group },
    });

    const ctx = createMockContext({
      rows: [{ id: 'canvas-1', name: 'Group Patch Canvas', created_at: '2024-01-01T00:00:00.000Z', automerge_url: 'automerge:canvas-1' }],
      docs: { 'automerge:canvas-1': doc },
    });

    const noOp = await executeCanvasPatch(ctx, {
      canvasId: 'canvas-1',
      canvasNameQuery: null,
      ids: ['group-1'],
      patch: {
        group: {
          locked: false,
        },
      },
    });

    expect(noOp.changedCount).toBe(0);
    expect(noOp.changedIds).toEqual([]);
    expect(ctx.waitCalls).toHaveLength(0);

    const changed = await executeCanvasPatch(ctx, {
      canvasId: 'canvas-1',
      canvasNameQuery: null,
      ids: ['group-1'],
      patch: {
        group: {
          locked: true,
        },
      },
    });

    expect(changed.changedIds).toEqual(['group-1']);
    expect(doc.groups['group-1']?.locked).toBe(true);
    expect(ctx.waitCalls).toHaveLength(1);
  });

  test('rejects invalid data field and mixed-kind payload mismatches with clear errors', async () => {
    const rect = createRectElement({ id: 'rect-1' });
    const text = createTextElement({ id: 'text-1' });
    const group = createGroup({ id: 'group-1' });
    const doc = createCanvasDoc({
      name: 'Invalid Patch Canvas',
      elements: {
        [rect.id]: rect,
        [text.id]: text,
      },
      groups: {
        [group.id]: group,
      },
    });

    const ctx = createMockContext({
      rows: [{ id: 'canvas-1', name: 'Invalid Patch Canvas', created_at: '2024-01-01T00:00:00.000Z', automerge_url: 'automerge:canvas-1' }],
      docs: { 'automerge:canvas-1': doc },
    });

    await expect(executeCanvasPatch(ctx, {
      canvasId: 'canvas-1',
      canvasNameQuery: null,
      ids: ['rect-1'],
      patch: {
        element: {
          data: { text: 'nope' },
        },
      },
    })).rejects.toBeInstanceOf(CanvasCmdError);

    await expect(executeCanvasPatch(ctx, {
      canvasId: 'canvas-1',
      canvasNameQuery: null,
      ids: ['rect-1'],
      patch: {
        element: {
          data: { text: 'nope' },
        },
      },
    })).rejects.toMatchObject({
      details: {
        code: 'CANVAS_PATCH_PAYLOAD_INVALID',
        message: "Patch field 'element.data.text' is invalid for element 'rect-1' of type 'rect'.",
      },
    });

    await expect(executeCanvasPatch(ctx, {
      canvasId: 'canvas-1',
      canvasNameQuery: null,
      ids: ['group-1'],
      patch: {
        element: {
          locked: true,
        },
      },
    })).rejects.toMatchObject({
      details: {
        code: 'CANVAS_PATCH_PAYLOAD_INVALID',
        message: 'Matched ids include groups, but the patch payload does not include a group branch.',
      },
    });
  });
});
