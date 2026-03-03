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

const DOWNLOAD_PROGRESS_START = 85;
const DOWNLOAD_PROGRESS_END = 96;

function mapDownloadPercentToOverall(downloadPercent: number): number {
  const normalized = Math.max(0, Math.min(100, Math.round(downloadPercent)));
  const span = DOWNLOAD_PROGRESS_END - DOWNLOAD_PROGRESS_START;
  return DOWNLOAD_PROGRESS_START + Math.round((normalized / 100) * span);
}

function parsePercentsFromChunk(chunk: string): number[] {
  const matches = chunk.matchAll(/(\d{1,3})(?:\.\d+)?%/g);
  const percents: number[] = [];

  for (const match of matches) {
    const value = Number.parseInt(match[1] ?? "", 10);
    if (Number.isFinite(value) && value >= 0 && value <= 100) {
      percents.push(value);
    }
  }

  return percents;
}

async function consumeStream(
  stream: ReadableStream<Uint8Array> | null | undefined,
  onChunk: (chunk: string) => void,
): Promise<void> {
  if (!stream) return;

  const reader = stream.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    onChunk(decoder.decode(value, { stream: true }));
  }

  const tail = decoder.decode();
  if (tail) onChunk(tail);
}

function commandForMethod(method: TInstallMethod, version: string): string | undefined {
  if (method === "npm") return `npm install -g vibecanvas@${version}`;
  return undefined;
}

async function applyUpgrade(args: TArgs): Promise<TApplyUpgradeResult> {
  if (args.method !== "curl") {
    const command = commandForMethod(args.method, args.version);
    return { ok: false, command, message: "Auto-install is only enabled for curl installs" };
  }

  args.onProgress?.({ percent: DOWNLOAD_PROGRESS_START, label: "Downloading update (0%)" });

  const script = `curl -fsSL https://vibecanvas.dev/install | bash -s -- --version ${args.version} --channel ${args.channel} --no-modify-path`;

  try {
    const proc = Bun.spawn(["bash", "-lc", script], {
      stdout: "pipe",
      stderr: "pipe",
    });

    let stderrText = "";
    let trailingChunk = "";
    let lastOverallPercent = DOWNLOAD_PROGRESS_START;
    let lastDownloadPercent = 0;
    let sawDownloadSignal = false;

    const emitDownloadProgress = (downloadPercent: number): void => {
      const normalized = Math.max(0, Math.min(100, Math.round(downloadPercent)));
      const overallPercent = mapDownloadPercentToOverall(normalized);

      if (overallPercent === lastOverallPercent && normalized === lastDownloadPercent) return;

      lastDownloadPercent = normalized;
      lastOverallPercent = overallPercent;
      sawDownloadSignal = true;
      args.onProgress?.({
        percent: overallPercent,
        label: `Downloading update (${normalized}%)`,
      });
    };

    const fallbackTicker = setInterval(() => {
      if (sawDownloadSignal) return;
      if (lastOverallPercent >= DOWNLOAD_PROGRESS_END - 2) return;

      lastOverallPercent += 1;
      args.onProgress?.({
        percent: lastOverallPercent,
        label: "Downloading update (waiting for progress data)",
      });
    }, 1200);

    const onOutput = (chunk: string): void => {
      const combined = `${trailingChunk}${chunk}`;
      const percents = parsePercentsFromChunk(combined);
      for (const percent of percents) {
        emitDownloadProgress(percent);
      }

      trailingChunk = combined.slice(-32);
    };

    try {
      await Promise.all([
        consumeStream(proc.stdout, onOutput),
        consumeStream(proc.stderr, (chunk) => {
          stderrText += chunk;
          onOutput(chunk);
        }),
        proc.exited,
      ]);
    } finally {
      clearInterval(fallbackTicker);
    }

    if (proc.exitCode !== 0) {
      return { ok: false, message: stderrText.trim() || "Upgrade command failed" };
    }

    if (lastDownloadPercent < 100) {
      emitDownloadProgress(100);
    }

    args.onProgress?.({ percent: 98, label: "Finalizing upgrade" });
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

export default applyUpgrade;
export { commandForMethod };
