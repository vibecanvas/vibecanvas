import type { TFilesystemApiContext } from './types';

type TInput = {
  watchId: string;
};

async function apiUnwatchFilesystem({ input, context }: { input: TInput; context: TFilesystemApiContext }) {
  context.filesystem.unwatch(input.watchId);
  return;
}

export { apiUnwatchFilesystem };
