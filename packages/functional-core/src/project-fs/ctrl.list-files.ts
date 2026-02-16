import type { exists } from "fs/promises";
import fxProjectFsProjectRoot from "./fx.project-root";
import fxProjectFsFileTree, { type TFileTree } from "./fx.file-tree";

type TPortal = {
  bun: { spawn: typeof Bun.spawn };
  fs: { exists: typeof exists };
  process: { cwd: () => string };
};

type TArgs = Record<string, never>;

/**
 * Lists all files in the project by first resolving the project root and then building a file tree.
 * @param portal - Bun, filesystem, and process access portal
 * @param args - Empty arguments (no input required)
 * @returns File tree containing all project files
 */
async function ctrlProjectFsListFiles(
  portal: TPortal,
  _args: TArgs
): Promise<TErrTuple<TFileTree>> {
  const [projectRoot, projectRootError] = await fxProjectFsProjectRoot(
    { fs: portal.fs, process: portal.process },
    {}
  );

  if (projectRootError) {
    return [null, projectRootError];
  }

  return fxProjectFsFileTree(
    { bun: portal.bun, fs: portal.fs },
    { projectRoot: projectRoot.absolutePath }
  );
}

export default ctrlProjectFsListFiles;
export type { TPortal, TArgs, TFileTree };
