import { homedir } from "os";
import { FilesystemErr } from "./err.codes";

type TPortal = {
  os: { homedir: typeof homedir };
};

export type TArgs = Record<string, never>;

export type TDirHome = { path: string };

export function ctrlDirHome(portal: TPortal, _args: TArgs): TErrTuple<TDirHome> {
  try {
    const home = portal.os.homedir();
    return [{ path: home }, null];
  } catch {
    return [null, { code: FilesystemErr.DIR_HOME_FAILED, statusCode: 500, externalMessage: { en: "Failed to get home directory" } }];
  }
}
