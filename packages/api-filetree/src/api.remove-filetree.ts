import { baseFiletreeOs } from './orpc';

const apiRemoveFiletree = baseFiletreeOs.remove.handler(async ({ input, context }) => {
  const filetree = context.db.getFileTree(input.params.id);
  if (!filetree) return;

  const deleted = context.db.deleteFileTree(input.params.id);
  if (!deleted) return;

  context.eventPublisher.publishDbEvent(filetree.canvas_id, {
    data: { change: 'delete', id: filetree.id, table: 'filetrees' },
  });
});

export { apiRemoveFiletree };
