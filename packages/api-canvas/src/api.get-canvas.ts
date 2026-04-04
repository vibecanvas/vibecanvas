import type { TCanvasApiContext } from './types';

type TInput = {
  params: {
    id: string;
  };
};

async function apiGetCanvas({ input, context }: { input: TInput; context: TCanvasApiContext }) {
  const result = context.db.getFullCanvas(input.params.id);
  if (!result) throw new Error('Canvas not found');

  return {
    canvas: [result.canvas],
    fileTrees: result.fileTrees,
  };
}

export { apiGetCanvas };
