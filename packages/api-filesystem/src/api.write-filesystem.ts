import { baseFilesystemOs } from './orpc';

const apiWriteFilesystem = baseFilesystemOs.write.handler(async ({ input, context }) => {
  const [result, error] = context.filesystem.write(input.query);
  if (error || !result) {
    return { type: error?.code ?? 'ERROR', message: error?.externalMessage?.en ?? 'Failed to write file' };
  }
  return result;
});

export { apiWriteFilesystem };
