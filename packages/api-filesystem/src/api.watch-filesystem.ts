import { ORPCError } from '@orpc/server';
import type { TFilesystemApiContext } from './types';

type TInput = {
  path: string;
  watchId: string;
};

async function* apiWatchFilesystem({ input, context }: { input: TInput; context: TFilesystemApiContext }) {
  const iterator = context.filesystem.watch(input.path, input.watchId);
  if (!iterator) throw new ORPCError('CONFLICT', { message: `Watch ${input.watchId} already exists` });

  try {
    for await (const event of iterator) {
      yield event;
    }
  } finally {
    context.filesystem.unwatch(input.watchId);
  }
}

export { apiWatchFilesystem };
