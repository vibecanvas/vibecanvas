import { ORPCError } from '@orpc/server';
import { baseCanvasOs } from './orpc';

const apiUpdateCanvas = baseCanvasOs.update.handler(async ({ input, context }) => {
  const canvas = context.db.updateCanvas({ id: input.params.id, ...input.body });

  if (!canvas) {
    throw new ORPCError('NOT_FOUND', { message: 'Canvas not found' });
  }

  return canvas;
});

export { apiUpdateCanvas };
