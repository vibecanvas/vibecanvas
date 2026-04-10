import { fnToApiFilesystemError } from './core/fn.to-api-filesystem-error';
import { baseFilesystemOs } from './orpc';

const apiHomeFilesystem = baseFilesystemOs.home.handler(async ({ context }) => {
  const result = { path: context.filesystem.homeDir() };
  if (!result.path) return fnToApiFilesystemError(null, 'Failed to get home directory');
  return result;
});

export { apiHomeFilesystem };
