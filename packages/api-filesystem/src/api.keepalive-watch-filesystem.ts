import { ORPCError } from '@orpc/server';
import { baseFilesystemOs } from './orpc';

const apiKeepaliveWatchFilesystem = baseFilesystemOs.keepaliveWatch.handler(async ({ input, context }) => {
  if (!context.filesystem.keepalive(input.watchId)) {
    throw new ORPCError('NOT_FOUND', { message: `Watch ${input.watchId} not found` });
  }
  return true;
});

export { apiKeepaliveWatchFilesystem };
