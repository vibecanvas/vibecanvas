import { homedir } from "os";
import { join, dirname } from "path";
import type { existsSync, mkdirSync } from "fs";
import { ConfigErr } from "./err.codes";

type TPortal = {
  fs: { existsSync: typeof existsSync, mkdirSync: typeof mkdirSync };
};

type TArgs = {
  env?: NodeJS.ProcessEnv;
};

type TConfigPath = {
  configDir: string;
  databasePath: string;
  created: boolean;
};

/**
 * Find the monorepo root by walking up from cwd until we find bun.lock
 */
function findMonorepoRoot(fs: TPortal["fs"], startDir: string): string | null {
  let current = startDir;
  while (current !== dirname(current)) {
    if (fs.existsSync(join(current, "bun.lock"))) {
      return current;
    }
    current = dirname(current);
  }
  // Check root directory as well
  if (fs.existsSync(join(current, "bun.lock"))) {
    return current;
  }
  return null;
}

function txConfigPath(portal: TPortal, args: TArgs = {}): TErrTriple<TConfigPath> {
  const rollbacks: TExternalRollback[] = [];

  try {
    const env = args.env ?? process.env;
    const envPath = env.VIBECANVAS_CONFIG;

    // Priority: 1) VIBECANVAS_CONFIG env, 2) Dev mode → ./local-volume/, 3) Production → ~/.vibecanvas/
    let configDir: string;
    if (envPath) {
      configDir = envPath;
    } else if (env.VIBECANVAS_COMPILED !== 'true') {
      // Dev mode: use local directory at monorepo root
      const monorepoRoot = findMonorepoRoot(portal.fs, process.cwd());
      if (!monorepoRoot) {
        return [
          null,
          {
            code: ConfigErr.CONFIG_PATH_CREATE_FAILED,
            statusCode: 500,
            externalMessage: { en: "Failed to find monorepo root" },
            internalMessage: "Could not locate bun.lock from " + process.cwd(),
          },
          rollbacks,
        ];
      }
      configDir = join(monorepoRoot, "local-volume");
    } else {
      // Production: use home directory
      configDir = join(homedir(), ".vibecanvas");
    }
    const databasePath = join(configDir, "vibecanvas.sqlite");

    if (!portal.fs.existsSync(configDir)) {
      portal.fs.mkdirSync(configDir, { recursive: true });
      return [{ configDir, databasePath, created: true }, null, rollbacks];
    }

    return [{ configDir, databasePath, created: false }, null, rollbacks];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return [
      null,
      {
        code: ConfigErr.CONFIG_PATH_CREATE_FAILED,
        statusCode: 500,
        externalMessage: { en: "Failed to create config directory" },
        internalMessage: errorMessage,
      },
      rollbacks,
    ];
  }
}

export default txConfigPath;
export type { TArgs, TConfigPath };
