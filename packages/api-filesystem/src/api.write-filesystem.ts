import type { TFilesystemApiContext } from './types';

type TInput = {
  query: {
    path: string;
    content: string;
  };
};

async function apiWriteFilesystem({ input, context }: { input: TInput; context: TFilesystemApiContext }) {
  const [result, error] = context.filesystem.write(input.query);
  if (error || !result) {
    return { type: error?.code ?? 'ERROR', message: error?.externalMessage?.en ?? 'Failed to write file' };
  }
  return result;
}

export { apiWriteFilesystem };
