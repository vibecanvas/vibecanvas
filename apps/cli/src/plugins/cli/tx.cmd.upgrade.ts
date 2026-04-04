import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { parseArgs } from 'util';
import type { IConfig } from '@vibecanvas/runtime';
import fnCliUpdateResolvePolicy from './cli-update/fn.resolve-policy';
import fnCliUpdateShouldUpgrade from './cli-update/fn.should-upgrade';
import { resolveCliPaths } from '../../resolve-paths';

type TInstallMethod = 'curl' | 'npm' | 'unknown';

type TUpdatePolicy = {
  mode: 'disabled' | 'notify' | 'install';
  reason: 'env' | 'config' | 'method' | 'default';
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
  | { status: 'updated'; version: string; method: TInstallMethod }
  | { status: 'up-to-date'; version: string; method: TInstallMethod }
  | { status: 'update-available'; version: string; method: TInstallMethod; command?: string }
  | { status: 'disabled'; method: TInstallMethod; reason: TUpdatePolicy['reason'] }
  | { status: 'error'; method: TInstallMethod; message: string };

type TConfigFile = {
  autoupdate?: boolean | 'notify';
};

type TRunUpgradeArgs = {
  config: IConfig;
};

type TCheckForUpgradeArgs = {
  config: IConfig;
  checkOnly?: boolean;
  methodOverride?: TInstallMethod;
  targetVersionOverride?: string;
  onProgress?: (event: TUpgradeProgressEvent) => void;
};

type TApplyUpgradeArgs = {
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

const ANSI_RESET = '\x1b[0m';
const RELEASES_API = 'https://api.github.com/repos/vibecanvas/vibecanvas/releases' as const;
const UPDATE_CHANNELS = ['stable', 'beta', 'nightly'] as const;
const DOWNLOAD_PROGRESS_START = 85;
const DOWNLOAD_PROGRESS_END = 96;

function printUpgradeHelp(): void {
  console.log(`Usage: vibecanvas upgrade [options]

Options:
  --check              Check for updates without installing
  --method <method>    Override install method (curl, npm, unknown)
  --target-version <v> Target specific version (leading "v" optional)
  --help, -h           Show this help message
`);
}

function getServerVersion(config: IConfig): string {
  return config.version;
}

function getUpdateChannel(): (typeof UPDATE_CHANNELS)[number] {
  const channel = process.env.VIBECANVAS_CHANNEL;
  if (channel === 'stable' || channel === 'beta' || channel === 'nightly') {
    return channel;
  }
  return 'stable';
}

function getExecPath(): string {
  return process.execPath;
}

function detectInstallMethod(): TInstallMethod {
  const execPath = getExecPath().toLowerCase();

  if (execPath.includes('.vibecanvas/bin') || execPath.includes('.vibecanvas\\bin')) {
    return 'curl';
  }

  if (execPath.includes('node_modules') || execPath.includes('bunx') || execPath.includes('npm')) {
    return 'npm';
  }

  return 'unknown';
}

function readConfigAutoupdate(config: IConfig): boolean | 'notify' | undefined {
  const { configDir } = resolveCliPaths(config);
  const configFilePath = join(configDir, 'config.json');
  if (!existsSync(configFilePath)) return undefined;

  try {
    const raw = readFileSync(configFilePath, 'utf8');
    const parsed = JSON.parse(raw) as TConfigFile;
    return parsed.autoupdate;
  } catch {
    return undefined;
  }
}

function resolveUpdatePolicy(config: IConfig, method: TInstallMethod): TUpdatePolicy {
  const [policy] = fnCliUpdateResolvePolicy({
    method,
    configAutoupdate: readConfigAutoupdate(config),
    envDisable: process.env.VIBECANVAS_DISABLE_AUTOUPDATE,
  });

  return policy ?? { mode: 'notify', reason: 'default' };
}

function extractVersionFromTag(tag: string): string {
  return tag.replace(/^v/i, '');
}

async function fetchLatestVersion(targetVersionOverride?: string): Promise<TLatestVersion | null> {
  const channel = getUpdateChannel();

  if (targetVersionOverride) {
    return { version: targetVersionOverride.replace(/^v/i, ''), channel };
  }

  if (channel === 'stable') {
    const response = await fetch(`${RELEASES_API}/latest`);
    if (!response.ok) return null;
    const data = (await response.json()) as { tag_name?: string };
    if (!data.tag_name) return null;
    return { version: extractVersionFromTag(data.tag_name), channel };
  }

  const response = await fetch(`${RELEASES_API}?per_page=50`);
  if (!response.ok) return null;

  const releases = (await response.json()) as Array<{ tag_name?: string }>;
  const match = releases.find((release) => release.tag_name?.toLowerCase().includes(channel));
  if (!match?.tag_name) return null;

  return { version: extractVersionFromTag(match.tag_name), channel };
}

function createUpgradeProgressRenderer() {
  const isTTY = Boolean(process.stdout.isTTY);
  const columns = process.stdout.columns ?? 80;
  const updateColor = Bun.color('#60a5fa', 'ansi') ?? '';
  const labelColor = Bun.color('#34d399', 'ansi') ?? '';
  const barColor = Bun.color('#22c55e', 'ansi') ?? '';

  let lastPercent = -1;
  let lastLabel = '';

  function clampPercent(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  function renderBar(percent: number): string {
    const barSize = 24;
    const filled = Math.round((percent / 100) * barSize);
    const empty = barSize - filled;
    const fill = '#'.repeat(filled);
    const rest = '-'.repeat(empty);
    return `${barColor}[${fill}${rest}]${ANSI_RESET}`;
  }

  function renderLine(percent: number, label: string): string {
    const line = `${updateColor}[Update]${ANSI_RESET} ${labelColor}${label}${ANSI_RESET} ${renderBar(percent)} ${percent}%`;
    return Bun.wrapAnsi(line, columns, { hard: true, wordWrap: true, trim: true }).replaceAll('\n', ' ');
  }

  function update(event: TUpgradeProgressEvent): void {
    const percent = clampPercent(event.percent);
    const label = event.label;

    if (!isTTY) {
      if (percent === lastPercent && label === lastLabel) return;
      console.log(`[Update] ${label} (${percent}%)`);
      lastPercent = percent;
      lastLabel = label;
      return;
    }

    const line = renderLine(percent, label);
    process.stdout.write(`\r\x1b[2K${line}`);
    lastPercent = percent;
    lastLabel = label;
  }

  function finish(): void {
    if (!isTTY) return;
    process.stdout.write('\n');
  }

  return { update, finish };
}

function mapDownloadPercentToOverall(downloadPercent: number): number {
  const normalized = Math.max(0, Math.min(100, Math.round(downloadPercent)));
  const span = DOWNLOAD_PROGRESS_END - DOWNLOAD_PROGRESS_START;
  return DOWNLOAD_PROGRESS_START + Math.round((normalized / 100) * span);
}

function parsePercentsFromChunk(chunk: string): number[] {
  const matches = chunk.matchAll(/(\d{1,3})(?:\.\d+)?%/g);
  const percents: number[] = [];

  for (const match of matches) {
    const value = Number.parseInt(match[1] ?? '', 10);
    if (Number.isFinite(value) && value >= 0 && value <= 100) {
      percents.push(value);
    }
  }

  return percents;
}

async function consumeStream(stream: ReadableStream<Uint8Array> | null | undefined, onChunk: (chunk: string) => void): Promise<void> {
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
  if (method === 'npm') return `npm install -g vibecanvas@${version}`;
  return undefined;
}

async function applyUpgrade(args: TApplyUpgradeArgs): Promise<TApplyUpgradeResult> {
  if (args.method !== 'curl') {
    const command = commandForMethod(args.method, args.version);
    return { ok: false, command, message: 'Auto-install is only enabled for curl installs' };
  }

  args.onProgress?.({ percent: DOWNLOAD_PROGRESS_START, label: 'Downloading update (0%)' });

  const script = `curl -fsSL https://vibecanvas.dev/install | bash -s -- --version ${args.version} --channel ${args.channel} --no-modify-path`;

  try {
    const proc = Bun.spawn(['bash', '-lc', script], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    let stderrText = '';
    let trailingChunk = '';
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
        label: 'Downloading update (waiting for progress data)',
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
      return { ok: false, message: stderrText.trim() || 'Upgrade command failed' };
    }

    if (lastDownloadPercent < 100) {
      emitDownloadProgress(100);
    }

    args.onProgress?.({ percent: 98, label: 'Finalizing upgrade' });
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

async function checkForUpgrade(args: TCheckForUpgradeArgs): Promise<TUpgradeResult> {
  args.onProgress?.({ percent: 10, label: 'Parsing options' });
  args.onProgress?.({ percent: 25, label: 'Resolving install method' });

  const method = args.methodOverride ?? detectInstallMethod();
  const policy = resolveUpdatePolicy(args.config, method);

  if (policy.mode === 'disabled') {
    args.onProgress?.({ percent: 100, label: 'Done' });
    return { status: 'disabled', method, reason: policy.reason };
  }

  args.onProgress?.({ percent: 45, label: 'Checking latest version' });
  const latest = await fetchLatestVersion(args.targetVersionOverride);
  if (!latest) {
    args.onProgress?.({ percent: 100, label: 'Done' });
    return { status: 'error', method, message: 'Failed to fetch latest version' };
  }

  const currentVersion = getServerVersion(args.config);
  args.onProgress?.({ percent: 65, label: 'Evaluating upgrade decision' });
  const [decision, decisionErr] = fnCliUpdateShouldUpgrade({
    currentVersion,
    latestVersion: latest.version,
  });

  if (decisionErr || !decision) {
    args.onProgress?.({ percent: 100, label: 'Done' });
    return {
      status: 'error',
      method,
      message: decisionErr?.externalMessage?.en ?? 'Version check failed',
    };
  }

  if (!decision.shouldUpgrade) {
    args.onProgress?.({ percent: 100, label: 'Done' });
    return { status: 'up-to-date', version: currentVersion, method };
  }

  const manualCommand = commandForMethod(method, latest.version) ?? undefined;

  if (args.checkOnly || policy.mode === 'notify') {
    args.onProgress?.({ percent: 100, label: 'Done' });
    return {
      status: 'update-available',
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
    args.onProgress?.({ percent: 100, label: 'Done' });
    return {
      status: 'update-available',
      version: latest.version,
      method,
      command: upgraded.command ?? manualCommand,
    };
  }

  args.onProgress?.({ percent: 100, label: 'Done' });
  return { status: 'updated', version: latest.version, method };
}

async function txCmdUpgrade(args: TRunUpgradeArgs): Promise<never> {
  const { values } = parseArgs({
    args: args.config.rawArgv,
    strict: false,
    allowPositionals: true,
    options: {
      check: {
        type: 'boolean',
        default: false,
      },
      method: {
        type: 'string',
      },
      'target-version': {
        type: 'string',
      },
      help: {
        type: 'boolean',
        short: 'h',
        default: false,
      },
    },
  });

  if (values.help) {
    printUpgradeHelp();
    process.exit(0);
  }

  const methodValue = values.method as string | undefined;
  const methodOverride = methodValue === 'curl' || methodValue === 'npm' || methodValue === 'unknown'
    ? methodValue
    : undefined;

  if (methodValue && !methodOverride) {
    console.error('[Update] Invalid --method. Allowed: curl, npm, unknown');
    process.exit(1);
  }

  const progress = createUpgradeProgressRenderer();
  const result = await checkForUpgrade({
    config: args.config,
    checkOnly: Boolean(values.check),
    methodOverride,
    targetVersionOverride: args.config.upgradeTarget ?? values['target-version'] as string | undefined,
    onProgress: progress.update,
  }).finally(() => {
    progress.finish();
  });
  const currentVersion = getServerVersion(args.config);

  if (result.status === 'updated') {
    console.log(`[Update] Current: v${currentVersion}`);
    console.log(`[Update] Method: ${result.method}`);
    console.log(`[Update] Updated to v${result.version}`);
    process.exit(0);
  }

  if (result.status === 'up-to-date') {
    console.log(`[Update] Current: v${currentVersion}`);
    console.log(`[Update] Latest:  v${result.version}`);
    console.log(`[Update] Method: ${result.method}`);
    console.log(`[Update] Already up to date (v${result.version})`);
    process.exit(0);
  }

  if (result.status === 'update-available') {
    console.log(`[Update] Current: v${currentVersion}`);
    console.log(`[Update] Latest:  v${result.version}`);
    console.log(`[Update] Method: ${result.method}`);
    if (values.check) {
      console.log('[Update] Check-only mode, no changes applied');
    }
    console.log(`[Update] New version available: v${result.version}`);
    if (result.command) {
      console.log(`[Update] Run: ${result.command}`);
    }
    process.exit(0);
  }

  if (result.status === 'disabled') {
    console.log(`[Update] Auto-update disabled (${result.reason})`);
    process.exit(0);
  }

  console.error(`[Update] ${result.message}`);
  process.exit(1);
}

export { txCmdUpgrade };
