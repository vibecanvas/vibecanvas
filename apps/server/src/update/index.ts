import { fnCliUpdateShouldUpgrade } from "@vibecanvas/core/cli-update/index";
import detectInstallMethod from "./method";
import resolveUpdatePolicy from "./policy";
import fetchLatestVersion, { currentChannel } from "./latest";
import applyUpgrade, { commandForMethod } from "./upgrade";
import { setLastCheckedAt, shouldCheckNow } from "./state";
import type { TInstallMethod, TUpgradeProgressEvent, TUpgradeResult } from "./types";
import { getServerVersion } from "../runtime";

type TArgs = {
  force?: boolean;
  checkOnly?: boolean;
  methodOverride?: TInstallMethod;
  targetVersionOverride?: string;
  onProgress?: (event: TUpgradeProgressEvent) => void;
};

async function checkForUpgrade(args: TArgs = {}): Promise<TUpgradeResult> {
  args.onProgress?.({ percent: 10, label: "Parsing options" });

  args.onProgress?.({ percent: 25, label: "Resolving install method" });
  const method = args.methodOverride ?? detectInstallMethod();

  if (!args.force && !shouldCheckNow()) {
    args.onProgress?.({ percent: 100, label: "Done" });
    return {
      status: "up-to-date",
      version: getServerVersion(),
      method,
    };
  }

  setLastCheckedAt();

  const policy = resolveUpdatePolicy(method);
  if (policy.mode === "disabled") {
    args.onProgress?.({ percent: 100, label: "Done" });
    return { status: "disabled", method, reason: policy.reason };
  }

  args.onProgress?.({ percent: 45, label: "Checking latest version" });
  const latest = args.targetVersionOverride
    ? { version: args.targetVersionOverride.replace(/^v/i, ""), channel: currentChannel() }
    : await fetchLatestVersion();
  if (!latest) {
    args.onProgress?.({ percent: 100, label: "Done" });
    return { status: "error", method, message: "Failed to fetch latest version" };
  }

  const currentVersion = getServerVersion();
  args.onProgress?.({ percent: 65, label: "Evaluating upgrade decision" });
  const [decision, decisionErr] = fnCliUpdateShouldUpgrade({
    currentVersion,
    latestVersion: latest.version,
  });

  if (decisionErr || !decision) {
    args.onProgress?.({ percent: 100, label: "Done" });
    return {
      status: "error",
      method,
      message: decisionErr?.externalMessage?.en ?? "Version check failed",
    };
  }

  if (!decision.shouldUpgrade) {
    args.onProgress?.({ percent: 100, label: "Done" });
    return { status: "up-to-date", version: currentVersion, method };
  }

  const manualCommand = commandForMethod(method, latest.version) ?? undefined;

  if (args.checkOnly) {
    args.onProgress?.({ percent: 100, label: "Done" });
    return {
      status: "update-available",
      version: latest.version,
      method,
      command: manualCommand,
    };
  }

  if (policy.mode === "notify") {
    args.onProgress?.({ percent: 100, label: "Done" });
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
    onProgress: args.onProgress,
  });

  if (!upgraded.ok) {
    args.onProgress?.({ percent: 100, label: "Done" });
    return {
      status: "update-available",
      version: latest.version,
      method,
      command: upgraded.command ?? manualCommand,
    };
  }

  args.onProgress?.({ percent: 100, label: "Done" });
  return { status: "updated", version: latest.version, method };
}

export default checkForUpgrade;
export { detectInstallMethod, resolveUpdatePolicy, fetchLatestVersion, applyUpgrade, shouldCheckNow };
