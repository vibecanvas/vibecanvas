import type { TFilesystemApiContext } from './types';

type TInput = {
  query: {
    path: string;
  };
};

async function apiInspectFilesystem({ input, context }: { input: TInput; context: TFilesystemApiContext }) {
  const [result, error] = context.filesystem.inspect({ path: input.query.path });
  if (error || !result) {
    return { type: error?.code ?? 'ERROR', message: error?.externalMessage?.en ?? 'Failed to inspect file' };
  }
  return result;
}

export { apiInspectFilesystem };
