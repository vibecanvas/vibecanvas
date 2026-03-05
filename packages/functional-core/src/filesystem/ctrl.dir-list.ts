import { readdirSync, existsSync, type Dirent } from "fs";
import { dirname, join } from "path";
import { FilesystemErr } from "./err.codes";

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

export type TArgs = { path: string, omitFiles?: boolean };

export type TDirEntry = { name: string; path: string, isDir: boolean };

type TDirList = {
  current: string;
  parent: string | null;
  children: TDirEntry[];
};

export function ctrlDirList(portal: TPortal, args: TArgs): TErrTuple<TDirList> {
  const { path: dirPath } = args;

  if (!portal.fs.existsSync(dirPath)) {
    return [null, { code: FilesystemErr.DIR_LIST_NOT_FOUND, statusCode: 404, externalMessage: { en: "Directory not found" } }];
  }

  const parent = dirPath === "/" ? null : portal.path.dirname(dirPath);

  try {
    const entries = portal.fs.readdirSync(dirPath, { withFileTypes: true }) as Dirent[];
    const children = entries
      .filter((entry) => !entry.name.startsWith(".") && (args.omitFiles ? entry.isDirectory() === true : false))
      .map((entry) => ({
        name: entry.name,
        path: portal.path.join(dirPath, entry.name),
        isDir: entry.isDirectory(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return [{ current: dirPath, parent, children }, null];
  } catch {
    return [null, { code: FilesystemErr.DIR_LIST_FAILED, statusCode: 403, externalMessage: { en: "Cannot read directory" } }];
  }
}
