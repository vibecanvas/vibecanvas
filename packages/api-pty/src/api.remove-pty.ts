import { ORPCError } from '@orpc/server';
import { basePtyOs } from './orpc';

const apiRemovePty = basePtyOs.remove.handler(async ({ input, context }) => {
  const removed = await context.pty.remove(input.workingDirectory, input.path.ptyID);
  if (!removed) throw new ORPCError('NOT_FOUND', { message: 'PTY not found' });
  return true;
});

export { apiRemovePty };
