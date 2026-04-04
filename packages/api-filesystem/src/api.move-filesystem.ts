import type { TFilesystemApiContext } from './types';

type TInput = {
  body: {
    source_path: string;
    destination_dir_path: string;
  };
};

async function apiMoveFilesystem({ input, context }: { input: TInput; context: TFilesystemApiContext }) {
  const [result, error] = context.filesystem.move(input.body);
  if (error || !result) {
    return { type: error?.code ?? 'ERROR', message: error?.externalMessage?.en ?? 'Failed to move file or folder' };
  }
  return result;
}

export { apiMoveFilesystem };
