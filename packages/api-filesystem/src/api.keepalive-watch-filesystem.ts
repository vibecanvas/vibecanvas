import { ORPCError } from '@orpc/server';
import type { TFilesystemApiContext } from './types';

type TInput = {
  watchId: string;
};

async function apiKeepaliveWatchFilesystem({ input, context }: { input: TInput; context: TFilesystemApiContext }) {
  if (!context.filesystem.keepalive(input.watchId)) {
    throw new ORPCError('NOT_FOUND', { message: `Watch ${input.watchId} not found` });
  }
  return true;
}

export { apiKeepaliveWatchFilesystem };
