import { ORPCError } from '@orpc/server';
import type { TPtyApiContext } from './types';

type TInput = {
  workingDirectory: string;
  path: {
    ptyID: string;
  };
};

async function apiRemovePty({ input, context }: { input: TInput; context: TPtyApiContext }) {
  const removed = await context.pty.remove(input.workingDirectory, input.path.ptyID);
  if (!removed) throw new ORPCError('NOT_FOUND', { message: 'PTY not found' });
  return true;
}

export { apiRemovePty };
