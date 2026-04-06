import { fxHomeFilesystem } from './core/fx.home-filesystem';
import { fnToApiFilesystemError } from './core/fn.to-api-filesystem-error';
import { baseFilesystemOs } from './orpc';

const apiHomeFilesystem = baseFilesystemOs.home.handler(async ({ context }) => {
  const [result, error] = fxHomeFilesystem({ filesystem: context.filesystem });
  if (error || !result) return fnToApiFilesystemError(error, 'Failed to get home directory');
  return result;
});

export { apiHomeFilesystem };
