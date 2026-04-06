import { fxListFilesystem } from './core/fx.list-filesystem';
import { fnToApiFilesystemError } from './core/fn.to-api-filesystem-error';
import { baseFilesystemOs } from './orpc';

const apiListFilesystem = baseFilesystemOs.list.handler(async ({ input, context }) => {
  const [result, error] = fxListFilesystem({ filesystem: context.filesystem }, input.query);
  if (error || !result) return fnToApiFilesystemError(error, 'Failed to list directory');
  return result;
});

export { apiListFilesystem };
