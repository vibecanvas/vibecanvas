import { fxReadFilesystem } from './core/fx.read-filesystem';
import { fnToApiFilesystemError } from './core/fn.to-api-filesystem-error';
import { baseFilesystemOs } from './orpc';

const apiReadFilesystem = baseFilesystemOs.read.handler(async ({ input, context }) => {
  const [result, error] = fxReadFilesystem({ filesystem: context.filesystem }, input.query);
  if (error || !result) return fnToApiFilesystemError(error, 'Failed to read file');
  return result;
});

export { apiReadFilesystem };
