/// <reference path="../build-constants.d.ts" />
import { fnCliUpdateResolvePolicy } from "@vibecanvas/core/cli-update/index";
import { txConfigPath } from "@vibecanvas/core/vibecanvas-config/tx.config-path";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";
import { readEnv } from "../runtime";
import type { TInstallMethod, TUpdatePolicy } from "./types";

type TConfigFile = {
  autoupdate?: boolean | "notify";
};

function readConfigAutoupdate(): boolean | "notify" | undefined {
  const isCompiled = typeof VIBECANVAS_COMPILED !== "undefined" ? VIBECANVAS_COMPILED : false;
  const [configPathData] = txConfigPath({ fs: { existsSync, mkdirSync } }, { isCompiled });
  if (!configPathData) return undefined;

  const configFilePath = join(configPathData.configDir, "config.json");
  if (!existsSync(configFilePath)) return undefined;

  try {
    const raw = readFileSync(configFilePath, "utf8");
    const parsed = JSON.parse(raw) as TConfigFile;
    return parsed.autoupdate;
  } catch {
    return undefined;
  }
}

function resolveUpdatePolicy(method: TInstallMethod): TUpdatePolicy {
  const configAutoupdate = readConfigAutoupdate();
  const [policy] = fnCliUpdateResolvePolicy({
    method,
    configAutoupdate,
    envDisable: readEnv("VIBECANVAS_DISABLE_AUTOUPDATE"),
  });

  return policy ?? { mode: "notify", reason: "default" };
}

export default resolveUpdatePolicy;
