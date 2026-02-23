type TInstallMethod = "curl" | "npm" | "unknown";

type TUpdatePolicy = {
  mode: "disabled" | "notify" | "install";
  reason: "env" | "config" | "method" | "default";
};

type TLatestVersion = {
  version: string;
  channel: string;
};

type TUpgradeProgressEvent = {
  percent: number;
  label: string;
};

type TUpgradeResult =
  | { status: "updated"; version: string; method: TInstallMethod }
  | { status: "up-to-date"; version: string; method: TInstallMethod }
  | { status: "update-available"; version: string; method: TInstallMethod; command?: string }
  | { status: "disabled"; method: TInstallMethod; reason: TUpdatePolicy["reason"] }
  | { status: "error"; method: TInstallMethod; message: string };

export type { TInstallMethod, TUpdatePolicy, TLatestVersion, TUpgradeResult, TUpgradeProgressEvent };
