import { fnToApiFilesystemError } from './core/fn.to-api-filesystem-error';
import { txWriteFilesystem } from './core/tx.write-filesystem';
import { baseFilesystemOs } from './orpc';

const apiWriteFilesystem = baseFilesystemOs.write.handler(async ({ input, context }) => {
  const [result, error] = txWriteFilesystem({ filesystem: context.filesystem }, input.query);
  if (error || !result) return fnToApiFilesystemError(error, 'Failed to write file');
  return result;
});

export { apiWriteFilesystem };
