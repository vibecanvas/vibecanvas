import type { TFilesystemApiContext } from './types';

type TInput = {
  query: {
    path: string;
    omitFiles?: boolean;
  };
};

async function apiListFilesystem({ input, context }: { input: TInput; context: TFilesystemApiContext }) {
  const [result, error] = context.filesystem.list(input.query);
  if (error || !result) {
    return { type: error?.code ?? 'ERROR', message: error?.externalMessage?.en ?? 'Failed to list directory' };
  }
  return result;
}

export { apiListFilesystem };
