import { ORPCError } from '@orpc/server';
import type { TPtyUpdateBody } from '@vibecanvas/pty-service/types';
import type { TPtyApiContext } from './types';

type TInput = {
  workingDirectory: string;
  path: {
    ptyID: string;
  };
  body: TPtyUpdateBody;
};

async function apiUpdatePty({ input, context }: { input: TInput; context: TPtyApiContext }) {
  const pty = context.pty.update(input.workingDirectory, input.path.ptyID, input.body);
  if (!pty) throw new ORPCError('NOT_FOUND', { message: 'PTY not found' });
  return pty;
}

export { apiUpdatePty };
