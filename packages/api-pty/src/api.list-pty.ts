import type { TPtyApiContext } from './types';

type TInput = {
  workingDirectory: string;
};

async function apiListPty({ input, context }: { input: TInput; context: TPtyApiContext }) {
  return context.pty.list(input.workingDirectory);
}

export { apiListPty };
