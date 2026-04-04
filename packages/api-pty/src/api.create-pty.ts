import type { TPtyCreateBody } from '@vibecanvas/pty-service/types';
import type { TPtyApiContext } from './types';

type TInput = {
  workingDirectory: string;
  body?: TPtyCreateBody;
};

async function apiCreatePty({ input, context }: { input: TInput; context: TPtyApiContext }) {
  return context.pty.create(input.workingDirectory, input.body);
}

export { apiCreatePty };
