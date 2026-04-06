import { fileMetaFromPathname } from './core/fn.file-storage';
import { baseFileOs } from './orpc';

const apiRemoveFile = baseFileOs.remove.handler(async ({ input, context }) => {
  const fileMeta = fileMetaFromPathname(new URL(input.body.url, 'http://localhost').pathname);
  if (!fileMeta) {
    throw new Error('Invalid file url');
  }

  const record = context.db.file.get({
    id: fileMeta.id,
    format: fileMeta.format,
  });

  if (!record) {
    return { ok: true as const };
  }

  context.db.file.deleteById({ id: record.id });

  return { ok: true as const };
});

export { apiRemoveFile };
