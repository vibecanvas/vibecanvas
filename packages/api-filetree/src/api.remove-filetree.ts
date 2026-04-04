import type { TFiletreeApiContext } from './types';

type TInput = {
  params: {
    id: string;
  };
};

async function apiRemoveFiletree({ input, context }: { input: TInput; context: TFiletreeApiContext }): Promise<void> {
  const filetree = context.db.getFileTree(input.params.id);
  if (!filetree) return;

  const deleted = context.db.deleteFileTree(input.params.id);
  if (!deleted) return;

  context.eventPublisher.publishDbEvent(filetree.canvas_id, {
    data: { change: 'delete', id: filetree.id, table: 'filetrees' },
  });
}

export { apiRemoveFiletree };
