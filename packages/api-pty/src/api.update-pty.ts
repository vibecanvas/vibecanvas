import { ORPCError } from '@orpc/server';
import { basePtyOs } from './orpc';

const apiUpdatePty = basePtyOs.update.handler(async ({ input, context }) => {
  const pty = context.pty.update(input.workingDirectory, input.path.ptyID, input.body);
  if (!pty) throw new ORPCError('NOT_FOUND', { message: 'PTY not found' });
  return pty;
});

export { apiUpdatePty };
