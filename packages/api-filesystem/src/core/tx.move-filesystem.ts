import { basename, join, resolve } from 'path';
import type { TFilesystemMoveArgs, TFilesystemMoveResult } from '@vibecanvas/filesystem-service/types';
import type { IFilesystemService } from '@vibecanvas/filesystem-service/IFilesystemService';
import { fnCreateFilesystemError } from './fn.create-filesystem-error';

function txMoveFilesystem(portal: { filesystem: IFilesystemService }, args: TFilesystemMoveArgs): TErrTuple<TFilesystemMoveResult> {
  const sourcePath = resolve(args.source_path);
  const destinationDirPath = resolve(args.destination_dir_path);

  if (!portal.filesystem.exists(sourcePath)) {
    return [null, fnCreateFilesystemError('TX.FILESYSTEM.MOVE.SOURCE_NOT_FOUND', `Source path not found: ${sourcePath}`, 404)];
  }

  const [destinationStats, destinationError] = portal.filesystem.stat(destinationDirPath);
  if (destinationError || !destinationStats) {
    return [null, destinationError ?? fnCreateFilesystemError('TX.FILESYSTEM.MOVE.DESTINATION_NOT_FOUND', `Destination path not found: ${destinationDirPath}`, 404)];
  }

  if (!destinationStats.isDirectory()) {
    return [null, fnCreateFilesystemError('TX.FILESYSTEM.MOVE.DESTINATION_NOT_DIRECTORY', `Destination is not a directory: ${destinationDirPath}`, 400)];
  }

  if (destinationDirPath === sourcePath || destinationDirPath.startsWith(`${sourcePath}/`)) {
    return [null, fnCreateFilesystemError('TX.FILESYSTEM.MOVE.INVALID_DESTINATION', 'Cannot move a path into itself', 400)];
  }

  const targetPath = join(destinationDirPath, basename(sourcePath));
  if (portal.filesystem.exists(targetPath)) {
    return [null, fnCreateFilesystemError('TX.FILESYSTEM.MOVE.TARGET_EXISTS', `Target path already exists: ${targetPath}`, 409)];
  }

  const [, renameError] = portal.filesystem.rename(sourcePath, targetPath);
  if (renameError) return [null, renameError];

  return [{
    source_path: sourcePath,
    destination_dir_path: destinationDirPath,
    target_path: targetPath,
    moved: true,
  }, null];
}

export { txMoveFilesystem };
