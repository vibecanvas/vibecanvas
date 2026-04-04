import { baseFilesystemOs } from './orpc';

const apiMoveFilesystem = baseFilesystemOs.move.handler(async ({ input, context }) => {
  const [result, error] = context.filesystem.move(input.body);
  if (error || !result) {
    return { type: error?.code ?? 'ERROR', message: error?.externalMessage?.en ?? 'Failed to move file or folder' };
  }
  return result;
});

export { apiMoveFilesystem };
