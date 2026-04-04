import { baseFilesystemOs } from './orpc';

const apiUnwatchFilesystem = baseFilesystemOs.unwatch.handler(async ({ input, context }) => {
  context.filesystem.unwatch(input.watchId);
});

export { apiUnwatchFilesystem };
