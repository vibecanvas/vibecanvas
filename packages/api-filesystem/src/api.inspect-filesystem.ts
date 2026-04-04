import { baseFilesystemOs } from './orpc';

const apiInspectFilesystem = baseFilesystemOs.inspect.handler(async ({ input, context }) => {
  const [result, error] = context.filesystem.inspect({ path: input.query.path });
  if (error || !result) {
    return { type: error?.code ?? 'ERROR', message: error?.externalMessage?.en ?? 'Failed to inspect file' };
  }
  return result;
});

export { apiInspectFilesystem };
