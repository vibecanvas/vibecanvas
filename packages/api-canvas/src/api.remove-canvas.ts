import type { TCanvasApiContext } from './types';

type TInput = {
  params: {
    id: string;
  };
};

async function apiRemoveCanvas({ input, context }: { input: TInput; context: TCanvasApiContext }): Promise<never> {
  void input;
  void context;
  throw new Error('api-canvas remove WIP: requires repo service extraction');
}

export { apiRemoveCanvas };
