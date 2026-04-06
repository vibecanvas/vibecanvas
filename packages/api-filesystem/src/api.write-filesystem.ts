import { resolve } from 'path';
import { fnToApiFilesystemError } from './core/fn.to-api-filesystem-error';
import { baseFilesystemOs } from './orpc';

const apiWriteFilesystem = baseFilesystemOs.write.handler(async ({ input, context }) => {
  const path = resolve(input.query.path);
  const [, error] = context.filesystem.writeFile(path, input.query.content);
  if (error) return fnToApiFilesystemError(error, 'Failed to write file');
  return { success: true as const };
});

export { apiWriteFilesystem };
