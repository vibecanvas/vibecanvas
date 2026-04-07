import { ORPCError } from '@orpc/server';
import type { TCanvasDoc, TElement } from '@vibecanvas/service-automerge/types/canvas-doc';
import { baseFiletreeOs } from './orpc';

function createFileTreeElement(id: string, x: number, y: number): TElement {
  const now = Date.now();
  return {
    id,
    x,
    y,
    rotation: 0,
    zIndex: 'a',
    parentGroupId: null,
    bindings: [],
    locked: false,
    createdAt: now,
    updatedAt: now,
    data: {
      type: 'filetree',
      w: 360,
      h: 460,
      isCollapsed: false,
    },
    style: {
      backgroundColor: '#f8f9fa',
      strokeColor: '#ced4da',
      strokeWidth: 1,
      opacity: 1,
    },
  };
}

const apiCreateFiletree = baseFiletreeOs.create.handler(async ({ input, context }) => {
  const full = context.db.getFullCanvas(input.canvas_id);
  if (!full) {
    throw new ORPCError('NOT_FOUND', { message: 'Canvas not found' });
  }

  const filetree = context.db.fileTree.create({
    canvas_id: input.canvas_id,
    title: 'File Tree',
    path: input.path ?? '',
    locked: false,
  });

  try {
    const handle = await context.automerge.repo.find<TCanvasDoc>(full.canvas.automerge_url as never);
    handle.change((doc: TCanvasDoc) => {
      doc.elements[filetree.id] = createFileTreeElement(filetree.id, input.x, input.y);
    });
  } catch (error) {
    context.db.fileTree.deleteById({ id: filetree.id });
    throw new ORPCError('INTERNAL_SERVER_ERROR', { message: 'Failed to create filetree', cause: error });
  }

  context.eventPublisher.publishDbEvent(filetree.canvas_id, {
    data: { change: 'insert', id: filetree.id, table: 'filetrees', record: filetree },
  });

  return filetree;
});

export { apiCreateFiletree };
