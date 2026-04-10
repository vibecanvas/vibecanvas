import { baseCanvasOs } from './orpc';

const apiListCanvas = baseCanvasOs.list.handler(async ({ context }) => {
  return context.db.canvas.listAll();
});

export { apiListCanvas };
