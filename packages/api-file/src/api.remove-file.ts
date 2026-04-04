import { fileMetaFromPathname } from '@vibecanvas/core/file/fn.file-storage';
import type { TFileApiContext } from './types';

type TInput = {
  body: {
    url: string;
  };
};

async function apiRemoveFile({ input, context }: { input: TInput; context: TFileApiContext }) {
  const fileMeta = fileMetaFromPathname(new URL(input.body.url, 'http://localhost').pathname);
  if (!fileMeta) {
    throw new Error('Invalid file url');
  }

  const record = context.db.getFile({
    id: fileMeta.id,
    format: fileMeta.format,
  });

  if (!record) {
    return { ok: true as const };
  }

  context.db.deleteFile(record.id);

  return { ok: true as const };
}

export { apiRemoveFile };
