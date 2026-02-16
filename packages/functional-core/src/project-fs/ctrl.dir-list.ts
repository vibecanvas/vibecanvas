import { readdirSync, existsSync, type Dirent } from "fs";
import { dirname, join } from "path";

type TPortal = {
  fs: {
    readdirSync: typeof readdirSync;
    existsSync: typeof existsSync;
  };
  path: {
    dirname: typeof dirname;
    join: typeof join;
  };
};

type TArgs = { path: string };

type TDirEntry = { name: string; path: string };

type TDirList = {
  current: string;
  parent: string | null;
  children: TDirEntry[];
};

/**
 * Lists immediate subdirectories (children only, not recursive) of a given directory path.
 * Filters out hidden directories (starting with ".").
 * @param portal - File system access portal
 * @param args - Arguments containing the directory path
 * @returns Current directory, parent path, and list of immediate subdirectory children
 */
function ctrlDirList(portal: TPortal, args: TArgs): TErrTuple<TDirList> {
  const { path: dirPath } = args;

  if (!portal.fs.existsSync(dirPath)) {
    return [null, { code: "CTRL.PROJECT_FS.DIR_LIST.NOT_FOUND", statusCode: 404, externalMessage: { en: "Directory not found" } }];
  }

  const parent = dirPath === "/" ? null : portal.path.dirname(dirPath);

  try {
    const entries = portal.fs.readdirSync(dirPath, { withFileTypes: true }) as Dirent[];
    const children = entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => ({
        name: entry.name,
        path: portal.path.join(dirPath, entry.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return [{ current: dirPath, parent, children }, null];
  } catch {
    return [null, { code: "CTRL.PROJECT_FS.DIR_LIST.FAILED", statusCode: 403, externalMessage: { en: "Cannot read directory" } }];
  }
}

export default ctrlDirList;
export type { TPortal, TArgs, TDirList, TDirEntry };
