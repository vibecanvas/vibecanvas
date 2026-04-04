import type { TPtyApiContext } from './types';

type TInput = {
  workingDirectory: string;
  path: {
    ptyID: string;
  };
};

async function apiGetPty({ input, context }: { input: TInput; context: TPtyApiContext }) {
  return context.pty.get(input.workingDirectory, input.path.ptyID) ?? null;
}

export { apiGetPty };
