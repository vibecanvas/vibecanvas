import type { TFilesystemApiContext } from './types';

type TInput = {
  query: {
    path: string;
    maxBytes?: number;
    content?: 'text' | 'base64' | 'binary' | 'none';
  };
};

async function apiReadFilesystem({ input, context }: { input: TInput; context: TFilesystemApiContext }) {
  const [result, error] = context.filesystem.read(input.query);
  if (error || !result) {
    return { type: error?.code ?? 'ERROR', message: error?.externalMessage?.en ?? 'Failed to read file' };
  }
  return result;
}

export { apiReadFilesystem };
