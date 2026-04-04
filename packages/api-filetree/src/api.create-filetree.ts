import type { TFiletreeApiContext } from './types';

type TInput = {
  canvas_id: string;
  path?: string;
  x: number;
  y: number;
};

async function apiCreateFiletree({ input, context }: { input: TInput; context: TFiletreeApiContext }): Promise<never> {
  void input;
  void context;
  throw new Error('api-filetree create WIP: requires repo service extraction');
}

export { apiCreateFiletree };
