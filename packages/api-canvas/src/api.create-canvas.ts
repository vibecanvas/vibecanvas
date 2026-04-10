import { ORPCError } from '@orpc/contract';
import { baseCanvasOs } from './orpc';

const apiCreateCanvas = baseCanvasOs.create.handler(async ({ context, input }) => {
  const existingCanvas = context.db.canvas.findByName(input.name);
  if (existingCanvas)
    throw new ORPCError('ALREADY_EXISTS', { message: 'Canvas already exists' });

  const id = crypto.randomUUID();

  const handle = context.automerge.repo.create({
    id,
    elements: {},
    groups: {},
  })

  const canvas = { id: crypto.randomUUID(), name: input.name, created_at: new Date(), automerge_url: handle.url };
  const result = context.db.canvas.create(canvas);
  return result;
});

export { apiCreateCanvas };
