import { existsSync, renameSync, statSync } from "fs";
import { basename, join, resolve, sep } from "path";

type TPortal = {
  fs: {
    existsSync: typeof existsSync;
    statSync: typeof statSync;
    renameSync: typeof renameSync;
  };
  path: {
    basename: typeof basename;
    join: typeof join;
    resolve: typeof resolve;
    sep: typeof sep;
  };
};

type TArgs = {
  source_path: string;
  destination_dir_path: string;
};

type TFileMoveResult = {
  source_path: string;
  destination_dir_path: string;
  target_path: string;
  moved: boolean;
};

export function ctrlFileMove(portal: TPortal, args: TArgs): TErrTuple<TFileMoveResult> {
  const sourcePath = args.source_path;
  const destinationDirPath = args.destination_dir_path;

  if (!portal.fs.existsSync(sourcePath)) {
    return [null, { code: "CTRL.PROJECT_FS.FILE_MOVE.SOURCE_NOT_FOUND", statusCode: 404, externalMessage: { en: "Source path not found" } }];
  }

  if (!portal.fs.existsSync(destinationDirPath)) {
    return [null, { code: "CTRL.PROJECT_FS.FILE_MOVE.DESTINATION_NOT_FOUND", statusCode: 404, externalMessage: { en: "Destination folder not found" } }];
  }

  let sourceStats: ReturnType<typeof statSync>;
  let destinationStats: ReturnType<typeof statSync>;
  try {
    sourceStats = portal.fs.statSync(sourcePath);
    destinationStats = portal.fs.statSync(destinationDirPath);
  } catch {
    return [null, { code: "CTRL.PROJECT_FS.FILE_MOVE.STAT_FAILED", statusCode: 403, externalMessage: { en: "Cannot access source or destination" } }];
  }

  if (!destinationStats.isDirectory()) {
    return [null, { code: "CTRL.PROJECT_FS.FILE_MOVE.DESTINATION_NOT_DIRECTORY", statusCode: 400, externalMessage: { en: "Destination must be a folder" } }];
  }

  const targetPath = portal.path.join(destinationDirPath, portal.path.basename(sourcePath));
  const sourceResolved = portal.path.resolve(sourcePath);
  const destinationResolved = portal.path.resolve(destinationDirPath);
  const targetResolved = portal.path.resolve(targetPath);

  if (sourceResolved === targetResolved) {
    return [{
      source_path: sourcePath,
      destination_dir_path: destinationDirPath,
      target_path: targetPath,
      moved: false,
    }, null];
  }

  if (sourceStats.isDirectory() && (destinationResolved === sourceResolved || destinationResolved.startsWith(`${sourceResolved}${portal.path.sep}`))) {
    return [null, { code: "CTRL.PROJECT_FS.FILE_MOVE.CANNOT_MOVE_INTO_DESCENDANT", statusCode: 400, externalMessage: { en: "Cannot move a folder into itself or its subfolder" } }];
  }

  if (portal.fs.existsSync(targetPath)) {
    return [null, { code: "CTRL.PROJECT_FS.FILE_MOVE.TARGET_EXISTS", statusCode: 409, externalMessage: { en: "A file or folder with the same name already exists in destination" } }];
  }

  try {
    portal.fs.renameSync(sourcePath, targetPath);
  } catch {
    return [null, { code: "CTRL.PROJECT_FS.FILE_MOVE.FAILED", statusCode: 500, externalMessage: { en: "Failed to move file or folder" } }];
  }

  return [{
    source_path: sourcePath,
    destination_dir_path: destinationDirPath,
    target_path: targetPath,
    moved: true,
  }, null];
}
