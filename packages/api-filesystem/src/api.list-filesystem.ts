import { baseFilesystemOs } from './orpc';

const apiListFilesystem = baseFilesystemOs.list.handler(async ({ input, context }) => {
  const [result, error] = context.filesystem.list(input.query);
  if (error || !result) {
    return { type: error?.code ?? 'ERROR', message: error?.externalMessage?.en ?? 'Failed to list directory' };
  }
  return result;
});

export { apiListFilesystem };
