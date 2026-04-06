import { fxFilesFilesystem } from './core/fx.files-filesystem';
import { fnToApiFilesystemError } from './core/fn.to-api-filesystem-error';
import { baseFilesystemOs } from './orpc';

const apiFilesFilesystem = baseFilesystemOs.files.handler(async ({ input, context }) => {
  const [result, error] = fxFilesFilesystem({ filesystem: context.filesystem }, input.query);
  if (error || !result) return fnToApiFilesystemError(error, 'Failed to list files');
  return result;
});

export { apiFilesFilesystem };
