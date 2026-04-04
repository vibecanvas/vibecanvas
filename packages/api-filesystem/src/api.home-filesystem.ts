import type { TFilesystemApiContext } from './types';

async function apiHomeFilesystem({ context }: { context: TFilesystemApiContext }) {
  const [result, error] = context.filesystem.home();
  if (error || !result) {
    return { type: error?.code ?? 'ERROR', message: error?.externalMessage?.en ?? 'Failed to get home directory' };
  }
  return result;
}

export { apiHomeFilesystem };
