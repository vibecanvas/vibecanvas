import type { existsSync, mkdirSync } from "fs";
import { ConfigErr } from "./err.codes";
import { fnXdgPaths, type TVibecanvasPaths, type TXdgPathsArgs } from "./fn.xdg-paths";

export type TPortal = {
  fs: { existsSync: typeof existsSync; mkdirSync: typeof mkdirSync };
};

export type TArgs = {
  env?: NodeJS.ProcessEnv;
  isCompiled?: boolean;
};

type TConfigPath = {
  configDir: string;
  databasePath: string;
  created: boolean;
  paths: TVibecanvasPaths;
};

function txConfigPath(portal: TPortal, args: TArgs = {}): TErrTriple<TConfigPath> {
  const rollbacks: TExternalRollback[] = [];

  try {
    const xdgArgs: TXdgPathsArgs = {
      env: args.env,
      isCompiled: args.isCompiled,
      findMonorepoRoot: (startDir: string) => {
        const { dirname, join } = require("path");
        let current = startDir;
        while (current !== dirname(current)) {
          if (portal.fs.existsSync(join(current, "bun.lock"))) {
            return current;
          }
          current = dirname(current);
        }
        if (portal.fs.existsSync(join(current, "bun.lock"))) {
          return current;
        }
        return null;
      },
    };

    const [paths, pathsErr] = fnXdgPaths(xdgArgs);
    if (pathsErr) {
      return [null, pathsErr, rollbacks];
    }

    // Ensure all XDG directories exist
    const dirs = [paths.dataDir, paths.configDir, paths.stateDir, paths.cacheDir];
    let created = false;

    for (const dir of dirs) {
      if (!portal.fs.existsSync(dir)) {
        portal.fs.mkdirSync(dir, { recursive: true });
        created = true;
      }
    }

    return [{
      // Legacy fields for backwards compatibility:
      // configDir points to dataDir since most callers used it to locate the DB
      configDir: paths.dataDir,
      databasePath: paths.databasePath,
      created,
      // New structured paths
      paths,
    }, null, rollbacks];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return [
      null,
      {
        code: ConfigErr.ENSURE_DIRS_FAILED,
        statusCode: 500,
        externalMessage: { en: "Failed to create config directories" },
        internalMessage: errorMessage,
      },
      rollbacks,
    ];
  }
}

export { txConfigPath };
export type { TConfigPath };
