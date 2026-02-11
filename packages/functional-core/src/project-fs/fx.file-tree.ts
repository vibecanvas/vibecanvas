import { join } from "path";
import { ProjectFsErr } from "./err.codes";

type TPortal = {
  bun: {
    spawn: typeof Bun.spawn;
  };
  fs: {
    exists: (path: string) => Promise<boolean>;
  };
};

type TArgs = {
  projectRoot: string;
};

type TFileTree = {
  projectRoot: string;
  files: string[];
};

async function runCommand(
  spawn: typeof Bun.spawn,
  cmd: string[],
  cwd: string
): Promise<{ stdout: string; exitCode: number }> {
  const proc = spawn(cmd, { cwd, stdout: "pipe" });
  const stdout = await new Response(proc.stdout).text();
  await proc.exited;
  return { stdout, exitCode: proc.exitCode ?? 0 };
}

async function fxProjectFsFileTree(
  portal: TPortal,
  args: TArgs
): Promise<TErrTuple<TFileTree>> {
  const { projectRoot } = args;

  // Check if projectRoot exists
  const rootExists = await portal.fs.exists(projectRoot);
  if (!rootExists) {
    return [
      null,
      {
        code: ProjectFsErr.FILE_TREE_PATH_NOT_FOUND,
        statusCode: 404,
        externalMessage: { en: "Project root path not found" },
      },
    ];
  }

  // Check if it's a git repo
  const gitDirPath = join(projectRoot, ".git");
  const isGitRepo = await portal.fs.exists(gitDirPath);

  let files: string[];

  if (isGitRepo) {
    // Use git ls-files for git repos (respects .gitignore)
    const [trackedResult, untrackedResult] = await Promise.all([
      runCommand(portal.bun.spawn, ["git", "ls-files"], projectRoot),
      runCommand(
        portal.bun.spawn,
        ["git", "ls-files", "--others", "--exclude-standard"],
        projectRoot
      ),
    ]);

    if (trackedResult.exitCode !== 0 || untrackedResult.exitCode !== 0) {
      return [
        null,
        {
          code: ProjectFsErr.FILE_TREE_EXEC_FAILED,
          statusCode: 500,
          externalMessage: { en: "Failed to execute git ls-files" },
        },
      ];
    }

    const trackedFiles = trackedResult.stdout
      .split("\n")
      .filter((f) => f.length > 0);
    const untrackedFiles = untrackedResult.stdout
      .split("\n")
      .filter((f) => f.length > 0);

    files = [...new Set([...trackedFiles, ...untrackedFiles])];
  } else {
    // Fallback: use find for non-git repos
    const findResult = await runCommand(
      portal.bun.spawn,
      [
        "find",
        ".",
        "-type",
        "f",
        "-not",
        "-path",
        "*/node_modules/*",
        "-not",
        "-path",
        "*/.git/*",
      ],
      projectRoot
    );

    if (findResult.exitCode !== 0) {
      return [
        null,
        {
          code: ProjectFsErr.FILE_TREE_EXEC_FAILED,
          statusCode: 500,
          externalMessage: { en: "Failed to execute find command" },
        },
      ];
    }

    files = findResult.stdout
      .split("\n")
      .filter((f) => f.length > 0)
      .map((f) => (f.startsWith("./") ? f.slice(2) : f));
  }

  // Sort alphabetically
  files.sort((a, b) => a.localeCompare(b));

  return [
    {
      projectRoot,
      files,
    },
    null,
  ];
}

export default fxProjectFsFileTree;
export type { TPortal, TArgs, TFileTree };
