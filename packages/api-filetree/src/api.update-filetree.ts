import { ORPCError } from '@orpc/server';
import type { TFiletreeApiContext } from './types';

type TInput = {
  params: {
    id: string;
  };
  body: {
    title?: string;
    path?: string;
    locked?: boolean;
    glob_pattern?: string | null;
  };
};

async function apiUpdateFiletree({ input, context }: { input: TInput; context: TFiletreeApiContext }) {
  const filetree = context.db.updateFileTree({ id: input.params.id, ...input.body });

  if (!filetree) {
    throw new ORPCError('NOT_FOUND', { message: 'Filetree not found' });
  }

  context.eventPublisher.publishDbEvent(filetree.canvas_id, {
    data: { change: 'update', id: filetree.id, table: 'filetrees', record: filetree },
  });

  return filetree;
}

export { apiUpdateFiletree };
