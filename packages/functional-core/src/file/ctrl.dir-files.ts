import { readdirSync, existsSync, statSync, type Dirent } from "fs";
import { join } from "path";

export type TPortal = {
  fs: {
    readdirSync: typeof readdirSync;
    existsSync: typeof existsSync;
    statSync: typeof statSync;
  };
  path: {
    join: typeof join;
  };
};

export type TArgs = {
  path: string;
  glob_pattern?: string;
  max_depth?: number;
};

type TDirNode = {
  name: string;
  path: string;
  is_dir: boolean;
  children: TDirNode[];
};

type TDirFiles = {
  root: string;
  children: TDirNode[];
};

function toSafeRegex(globPattern: string): RegExp {
  const escaped = globPattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "__DOUBLE_STAR__")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]")
    .replace(/__DOUBLE_STAR__/g, ".*");
  return new RegExp(`^${escaped}$`);
}

function createMatcher(globPattern: string | undefined): ((relativePath: string, name: string) => boolean) | null {
  if (!globPattern || globPattern.trim() === "") return null;
  const pattern = globPattern.trim().replaceAll("\\", "/");
  const regex = toSafeRegex(pattern);

  if (pattern.includes("/")) {
    return (relativePath) => regex.test(relativePath.replaceAll("\\", "/"));
  }

  return (relativePath, name) => {
    const normalized = relativePath.replaceAll("\\", "/");
    return regex.test(name) || regex.test(normalized);
  };
}

/**
 * Recursively lists all files and directories under a given path, optionally filtered by a glob pattern.
 * Performs a depth-first traversal and returns both files and directories with their metadata.
 * @param portal - File system access portal
 * @param args - Arguments containing path and optional glob_pattern
 * @returns Directory contents with root path and list of files/directories
 */
export function ctrlDirFiles(portal: TPortal, args: TArgs): TErrTuple<TDirFiles> {
  const rootPath = args.path;

  if (!portal.fs.existsSync(rootPath)) {
    return [null, { code: "CTRL.PROJECT_FS.DIR_FILES.NOT_FOUND", statusCode: 404, externalMessage: { en: "Directory not found" } }];
  }

  try {
    if (!portal.fs.statSync(rootPath).isDirectory()) {
      return [null, { code: "CTRL.PROJECT_FS.DIR_FILES.NOT_DIRECTORY", statusCode: 400, externalMessage: { en: "Path must be a directory" } }];
    }
  } catch {
    return [null, { code: "CTRL.PROJECT_FS.DIR_FILES.STAT_FAILED", statusCode: 403, externalMessage: { en: "Cannot read directory" } }];
  }

  const matcher = createMatcher(args.glob_pattern);
  const maxDepth = Math.max(0, Math.floor(args.max_depth ?? 5));

  const walk = (absolutePath: string, relativePath: string, depth: number): TDirNode[] => {
    if (depth >= maxDepth) {
      return [];
    }

    let entries: Dirent[] = [];
    try {
      entries = portal.fs.readdirSync(absolutePath, { withFileTypes: true }) as Dirent[];
    } catch {
      return [];
    }

    const sortedEntries = entries
      .filter((entry) => !entry.name.startsWith("."))
      .sort((a, b) => a.name.localeCompare(b.name));

    const nodes: TDirNode[] = [];

    for (const entry of sortedEntries) {
      const nextAbsolutePath = portal.path.join(absolutePath, entry.name);
      const nextRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      const isMatch = !matcher || matcher(nextRelativePath, entry.name);

      if (entry.isDirectory()) {
        const childNodes = walk(nextAbsolutePath, nextRelativePath, depth + 1);
        if (!matcher || isMatch || childNodes.length > 0) {
          nodes.push({
            name: entry.name,
            path: nextAbsolutePath,
            is_dir: true,
            children: childNodes,
          });
        }
        continue;
      }

      if (!isMatch) continue;

      nodes.push({
        name: entry.name,
        path: nextAbsolutePath,
        is_dir: false,
        children: [],
      });
    }

    return nodes;
  };

  const children = walk(rootPath, "", 0);
  return [{ root: rootPath, children }, null];
}
