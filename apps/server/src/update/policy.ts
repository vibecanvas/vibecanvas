/// <reference path="../build-constants.d.ts" />
import { readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { fnCliUpdateResolvePolicy } from "@vibecanvas/core/cli-update/index";
import { txConfigPath } from "@vibecanvas/core/vibecanvas-config/index";
import type { TInstallMethod, TUpdatePolicy } from "./types";
import { readEnv } from "../runtime";

type TConfigFile = {
  autoupdate?: boolean | "notify";
};

function readConfigAutoupdate(): boolean | "notify" | undefined {
  const [configPathData] = txConfigPath({ fs: { existsSync, mkdirSync } }, { isCompiled: VIBECANVAS_COMPILED });
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
