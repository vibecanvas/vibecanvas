import { resolve } from 'path';
import type { TFilesystemWriteArgs, TFilesystemWriteResult } from '@vibecanvas/filesystem-service/types';
import type { IFilesystemService } from '@vibecanvas/filesystem-service/IFilesystemService';

function txWriteFilesystem(portal: { filesystem: IFilesystemService }, args: TFilesystemWriteArgs): TErrTuple<TFilesystemWriteResult> {
  const path = resolve(args.path);
  const [, error] = portal.filesystem.writeFile(path, args.content);
  if (error) return [null, error];
  return [{ success: true }, null];
}

export { txWriteFilesystem };
