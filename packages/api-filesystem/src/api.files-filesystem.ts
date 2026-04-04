import type { TFilesystemApiContext } from './types';

type TInput = {
  query: {
    path: string;
    glob_pattern?: string;
    max_depth?: number;
  };
};

async function apiFilesFilesystem({ input, context }: { input: TInput; context: TFilesystemApiContext }) {
  const [result, error] = context.filesystem.files(input.query);
  if (error || !result) {
    return { type: error?.code ?? 'ERROR', message: error?.externalMessage?.en ?? 'Failed to list files' };
  }
  return result;
}

export { apiFilesFilesystem };
