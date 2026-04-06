import { fnToApiFilesystemError } from './core/fn.to-api-filesystem-error';
import { txMoveFilesystem } from './core/tx.move-filesystem';
import { baseFilesystemOs } from './orpc';

const apiMoveFilesystem = baseFilesystemOs.move.handler(async ({ input, context }) => {
  const [result, error] = txMoveFilesystem({ filesystem: context.filesystem }, input.body);
  if (error || !result) return fnToApiFilesystemError(error, 'Failed to move file or folder');
  return result;
});

export { apiMoveFilesystem };
