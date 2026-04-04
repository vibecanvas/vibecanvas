import { ORPCError } from '@orpc/server';
import { baseFilesystemOs } from './orpc';

const apiWatchFilesystem = baseFilesystemOs.watch.handler(async function* ({ input, context }) {
  const iterator = context.filesystem.watch(input.path, input.watchId);
  if (!iterator) throw new ORPCError('CONFLICT', { message: `Watch ${input.watchId} already exists` });

  try {
    for await (const event of iterator) {
      yield event;
    }
  } finally {
    context.filesystem.unwatch(input.watchId);
  }
});

export { apiWatchFilesystem };
