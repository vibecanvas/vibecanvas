import { fxInspectFilesystem } from './core/fx.inspect-filesystem';
import { fnToApiFilesystemError } from './core/fn.to-api-filesystem-error';
import { baseFilesystemOs } from './orpc';

const apiInspectFilesystem = baseFilesystemOs.inspect.handler(async ({ input, context }) => {
  const [result, error] = fxInspectFilesystem({ filesystem: context.filesystem }, { path: input.query.path });
  if (error || !result) return fnToApiFilesystemError(error, 'Failed to inspect file');
  return result;
});

export { apiInspectFilesystem };
