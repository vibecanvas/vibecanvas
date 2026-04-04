import { ORPCError } from '@orpc/server';
import { baseFiletreeOs } from './orpc';

const apiUpdateFiletree = baseFiletreeOs.update.handler(async ({ input, context }) => {
  const filetree = context.db.updateFileTree({ id: input.params.id, ...input.body });

  if (!filetree) {
    throw new ORPCError('NOT_FOUND', { message: 'Filetree not found' });
  }

  context.eventPublisher.publishDbEvent(filetree.canvas_id, {
    data: { change: 'update', id: filetree.id, table: 'filetrees', record: filetree },
  });

  return filetree;
});

export { apiUpdateFiletree };
