import { homedir } from "os";

type TPortal = {
  os: { homedir: typeof homedir };
};

type TArgs = Record<string, never>;

type TDirHome = { path: string };

/**
 * Retrieves the current user's home directory path from the operating system.
 * @param portal - OS access portal
 * @param args - Empty arguments (no input required)
 * @returns Home directory path
 */
function ctrlDirHome(portal: TPortal, _args: TArgs): TErrTuple<TDirHome> {
  try {
    const home = portal.os.homedir();
    return [{ path: home }, null];
  } catch {
    return [null, { code: "CTRL.PROJECT_FS.DIR_HOME.FAILED", statusCode: 500, externalMessage: { en: "Failed to get home directory" } }];
  }
}

export default ctrlDirHome;
export type { TPortal, TArgs, TDirHome };
