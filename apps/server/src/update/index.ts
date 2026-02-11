import { fnCliUpdateShouldUpgrade } from "@vibecanvas/core/cli-update/index";
import detectInstallMethod from "./method";
import resolveUpdatePolicy from "./policy";
import fetchLatestVersion, { currentChannel } from "./latest";
import applyUpgrade, { commandForMethod } from "./upgrade";
import { setLastCheckedAt, shouldCheckNow } from "./state";
import type { TInstallMethod, TUpgradeResult } from "./types";
import { getServerVersion } from "../runtime";

type TArgs = {
  force?: boolean;
  checkOnly?: boolean;
  methodOverride?: TInstallMethod;
  targetVersionOverride?: string;
};

async function checkForUpgrade(args: TArgs = {}): Promise<TUpgradeResult> {
  const method = args.methodOverride ?? detectInstallMethod();

  if (!args.force && !shouldCheckNow()) {
    return {
      status: "up-to-date",
      version: getServerVersion(),
      method,
    };
  }

  setLastCheckedAt();

  const policy = resolveUpdatePolicy(method);
  if (policy.mode === "disabled") {
    return { status: "disabled", method, reason: policy.reason };
  }

  const latest = args.targetVersionOverride
    ? { version: args.targetVersionOverride.replace(/^v/i, ""), channel: currentChannel() }
    : await fetchLatestVersion();
  if (!latest) {
    return { status: "error", method, message: "Failed to fetch latest version" };
  }

  const currentVersion = getServerVersion();
  const [decision, decisionErr] = fnCliUpdateShouldUpgrade({
    currentVersion,
    latestVersion: latest.version,
  });

  if (decisionErr || !decision) {
    return {
      status: "error",
      method,
      message: decisionErr?.externalMessage?.en ?? "Version check failed",
    };
  }

  if (!decision.shouldUpgrade) {
    return { status: "up-to-date", version: currentVersion, method };
  }

  const manualCommand = commandForMethod(method, latest.version) ?? undefined;

  if (args.checkOnly) {
    return {
      status: "update-available",
      version: latest.version,
      method,
      command: manualCommand,
    };
  }

  if (policy.mode === "notify") {
    return {
      status: "update-available",
      version: latest.version,
      method,
      command: manualCommand,
    };
  }

  const upgraded = await applyUpgrade({
    method,
    version: latest.version,
    channel: latest.channel,
  });

  if (!upgraded.ok) {
    return {
      status: "update-available",
      version: latest.version,
      method,
      command: upgraded.command ?? manualCommand,
    };
  }

  return { status: "updated", version: latest.version, method };
}

export default checkForUpgrade;
export { detectInstallMethod, resolveUpdatePolicy, fetchLatestVersion, applyUpgrade, shouldCheckNow };
