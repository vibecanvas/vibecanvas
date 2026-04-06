import { dirname, resolve } from 'path';
import { fnCreateFilesystemError } from './core/fn.create-filesystem-error';
import { fnToApiFilesystemError } from './core/fn.to-api-filesystem-error';
import { baseFilesystemOs } from './orpc';

const apiListFilesystem = baseFilesystemOs.list.handler(async ({ input, context }) => {
  const current = resolve(input.query.path);
  if (!context.filesystem.exists(current)) {
    return fnToApiFilesystemError(fnCreateFilesystemError('FX.FILESYSTEM.LIST.NOT_FOUND', `Path not found: ${current}`, 404), 'Failed to list directory');
  }

  const [entries, readError] = context.filesystem.readdir(current);
  if (readError || !entries) return fnToApiFilesystemError(readError, 'Failed to list directory');

  const children = entries
    .filter((entry) => !input.query.omitFiles || entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      path: resolve(current, entry.name),
      isDir: entry.isDirectory(),
    }))
    .sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name));

  const parent = dirname(current);
  return {
    current,
    parent: parent === current ? null : parent,
    children,
  };
});

export { apiListFilesystem };
