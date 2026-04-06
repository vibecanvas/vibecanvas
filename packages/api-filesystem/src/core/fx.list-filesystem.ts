import { dirname, resolve } from 'path';
import type { TFilesystemListArgs, TFilesystemListResult } from '@vibecanvas/filesystem-service/types';
import type { IFilesystemService } from '@vibecanvas/filesystem-service/IFilesystemService';
import { fnCreateFilesystemError } from './fn.create-filesystem-error';

function fxListFilesystem(portal: { filesystem: IFilesystemService }, args: TFilesystemListArgs): TErrTuple<TFilesystemListResult> {
  const current = resolve(args.path);
  if (!portal.filesystem.exists(current)) {
    return [null, fnCreateFilesystemError('FX.FILESYSTEM.LIST.NOT_FOUND', `Path not found: ${current}`, 404)];
  }

  const [entries, readError] = portal.filesystem.readdir(current);
  if (readError || !entries) {
    return [null, readError ?? fnCreateFilesystemError('FX.FILESYSTEM.LIST.FAILED', `Failed to list directory: ${current}`)];
  }

  const children = entries
    .filter((entry) => !args.omitFiles || entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      path: resolve(current, entry.name),
      isDir: entry.isDirectory(),
    }))
    .sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name));

  const parent = dirname(current);
  return [{
    current,
    parent: parent === current ? null : parent,
    children,
  }, null];
}

export { fxListFilesystem };
