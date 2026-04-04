import type { TCanvasApiContext } from './types';

async function apiListCanvas({ context }: { context: TCanvasApiContext }) {
  return context.db.listCanvas();
}

export { apiListCanvas };
