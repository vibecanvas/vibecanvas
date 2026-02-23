import type { TInstallMethod } from "./types";
import type { TUpgradeProgressEvent } from "./types";

type TArgs = {
  method: TInstallMethod;
  version: string;
  channel: string;
  onProgress?: (event: TUpgradeProgressEvent) => void;
};

type TApplyUpgradeResult = {
  ok: boolean;
  command?: string;
  message?: string;
};

function commandForMethod(method: TInstallMethod, version: string): string | undefined {
  if (method === "npm") return `npm install -g vibecanvas@${version}`;
  return undefined;
}

async function applyUpgrade(args: TArgs): Promise<TApplyUpgradeResult> {
  if (args.method !== "curl") {
    const command = commandForMethod(args.method, args.version);
    return { ok: false, command, message: "Auto-install is only enabled for curl installs" };
  }

  args.onProgress?.({ percent: 85, label: "Installing update" });

  const script = `curl -fsSL https://vibecanvas.dev/install | bash -s -- --version ${args.version} --channel ${args.channel} --no-modify-path`;

  try {
    const result = await Bun.$`bash -lc ${script}`.quiet();
    if (result.exitCode !== 0) {
      return { ok: false, message: result.stderr.toString() || "Upgrade command failed" };
    }
    args.onProgress?.({ percent: 95, label: "Finalizing upgrade" });
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

export default applyUpgrade;
export { commandForMethod };
