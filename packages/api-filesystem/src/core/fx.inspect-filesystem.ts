import { basename, resolve } from 'path';
import type { TFilesystemInspectArgs, TFilesystemInspectResult } from '@vibecanvas/filesystem-service/types';
import type { IFilesystemService } from '@vibecanvas/filesystem-service/IFilesystemService';
import { fnCreateFilesystemError } from './fn.create-filesystem-error';
import { fnDetectFileKind } from './fn.detect-file-kind';
import { fnDetectMime } from './fn.detect-mime';
import { fnPermissionsToRwx } from './fn.permissions-to-rwx';

function fxInspectFilesystem(portal: { filesystem: IFilesystemService }, args: TFilesystemInspectArgs): TErrTuple<TFilesystemInspectResult> {
  const path = resolve(args.path);
  const [stats, error] = portal.filesystem.stat(path);
  if (error || !stats) {
    return [null, error ?? fnCreateFilesystemError('FX.FILESYSTEM.INSPECT.NOT_FOUND', `Path not found: ${path}`, 404)];
  }

  return [{
    name: basename(path),
    path,
    mime: fnDetectMime(path),
    kind: fnDetectFileKind(path),
    size: stats.size,
    lastModified: stats.mtimeMs,
    permissions: fnPermissionsToRwx(stats.mode),
  }, null];
}

export { fxInspectFilesystem };
