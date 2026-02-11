import { homedir } from "os";
import { join } from "path";
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

function txConfigPath(portal: TPortal, args: TArgs = {}): TErrTriple<TConfigPath> {
  const rollbacks: TExternalRollback[] = [];

  try {
    const env = args.env ?? process.env;
    const envPath = env.VIBECANVAS_CONFIG;

    const configDir = envPath || join(homedir(), ".vibecanvas");
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
