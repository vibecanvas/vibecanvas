import { ORPCError } from '@orpc/server';
import { baseCanvasOs } from './orpc';

const apiUpdateCanvas = baseCanvasOs.update.handler(async ({ input, context }) => {
  if (input.body.name === undefined) {
    const full = context.db.getFullCanvas(input.params.id);
    if (!full) {
      throw new ORPCError('NOT_FOUND', { message: 'Canvas not found' });
    }

    return full.canvas;
  }

  const canvas = context.db.canvas.renameById({
    id: input.params.id,
    name: input.body.name,
  });

  if (!canvas) {
    throw new ORPCError('NOT_FOUND', { message: 'Canvas not found' });
  }

  return canvas;
});

export { apiUpdateCanvas };
