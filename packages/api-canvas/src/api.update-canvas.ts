import { ORPCError } from '@orpc/server';
import type { TCanvasApiContext } from './types';

type TInput = {
  params: {
    id: string;
  };
  body: {
    name?: string;
    path?: string;
  };
};

async function apiUpdateCanvas({ input, context }: { input: TInput; context: TCanvasApiContext }) {
  const canvas = context.db.updateCanvas({ id: input.params.id, ...input.body });

  if (!canvas) {
    throw new ORPCError('NOT_FOUND', { message: 'Canvas not found' });
  }

  return canvas;
}

export { apiUpdateCanvas };
