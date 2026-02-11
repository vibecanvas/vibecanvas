import { dirname, join } from "path";
import type { exists } from "fs/promises";
import { ProjectFsErr } from "./err.codes";

type TPortal = {
  fs: {
    // Must use fs/promises exists (works for files AND directories)
    // NOT Bun.file().exists() which only works for files
    exists: typeof exists;
  };
  process: {
    cwd: () => string;
  };
};

type TArgs = Record<string, never>;

type TProjectRoot = {
  absolutePath: string;
};

/**
 * @deprecated every canvas has different project root, must read from db
 */
async function fxProjectFsProjectRoot(
  portal: TPortal,
  _args: TArgs
): Promise<TErrTuple<TProjectRoot>> {
  let currentPath = portal.process.cwd();

  while (true) {
    const claudePath = join(currentPath, ".claude");
    const claudeExists = await portal.fs.exists(claudePath);

    if (claudeExists) {
      const gitPath = join(currentPath, ".git");
      const gitExists = await portal.fs.exists(gitPath);

      if (!gitExists) {
        return [
          null,
          {
            code: ProjectFsErr.PROJECT_ROOT_GIT_NOT_FOUND,
            statusCode: 404,
            externalMessage: {
              en: ".claude folder found but .git is missing",
            },
          },
        ];
      }

      return [{ absolutePath: currentPath }, null];
    }

    const parentPath = dirname(currentPath);

    if (parentPath === currentPath) {
      return [
        null,
        {
          code: ProjectFsErr.PROJECT_ROOT_CLAUDE_NOT_FOUND,
          statusCode: 404,
          externalMessage: {
            en: ".claude folder not found in any parent directory",
          },
        },
      ];
    }

    currentPath = parentPath;
  }
}

export default fxProjectFsProjectRoot;
export type { TPortal, TArgs, TProjectRoot };
