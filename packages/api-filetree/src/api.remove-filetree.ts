import { baseFiletreeOs } from './orpc';

const apiRemoveFiletree = baseFiletreeOs.remove.handler(async ({ input, context }) => {
  const filetree = context.db.fileTree.listAll().find((row) => row.id === input.params.id);
  if (!filetree) return;

  const deleted = context.db.fileTree.deleteById({ id: input.params.id });
  if (!deleted) return;

  context.eventPublisher.publishDbEvent(filetree.canvas_id, {
    data: { change: 'delete', id: filetree.id, table: 'filetrees' },
  });
});

export { apiRemoveFiletree };
