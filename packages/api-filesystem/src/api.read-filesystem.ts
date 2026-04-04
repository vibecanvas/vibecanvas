import { baseFilesystemOs } from './orpc';

const apiReadFilesystem = baseFilesystemOs.read.handler(async ({ input, context }) => {
  const [result, error] = context.filesystem.read(input.query);
  if (error || !result) {
    return { type: error?.code ?? 'ERROR', message: error?.externalMessage?.en ?? 'Failed to read file' };
  }
  return result;
});

export { apiReadFilesystem };
