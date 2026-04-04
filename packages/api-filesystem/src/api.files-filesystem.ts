import { baseFilesystemOs } from './orpc';

const apiFilesFilesystem = baseFilesystemOs.files.handler(async ({ input, context }) => {
  const [result, error] = context.filesystem.files(input.query);
  if (error || !result) {
    return { type: error?.code ?? 'ERROR', message: error?.externalMessage?.en ?? 'Failed to list files' };
  }
  return result;
});

export { apiFilesFilesystem };
