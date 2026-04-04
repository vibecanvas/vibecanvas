import type { TCanvasApiContext } from './types';

type TInput = {
  name: string;
};

async function apiCreateCanvas({ input, context }: { input: TInput; context: TCanvasApiContext }): Promise<never> {
  void input;
  void context;
  throw new Error('api-canvas create WIP: requires repo service extraction');
}

export { apiCreateCanvas };
