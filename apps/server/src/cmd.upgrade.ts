import { parseArgs } from 'util';
import checkForUpgrade from './update';
import type { TInstallMethod, TUpgradeProgressEvent } from './update/types';
import { getServerVersion } from './runtime';

const ANSI_RESET = '\x1b[0m';

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

/**
 * Handles the 'upgrade' subcommand.
 * Re-parses argv for upgrade-specific flags and runs the upgrade logic.
 */
export async function runUpgrade(argv: readonly string[]): Promise<never> {
  const { values } = parseArgs({
    args: argv,
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
    console.log(`Usage: vibecanvas upgrade [options]

Options:
  --check              Check for updates without installing
  --method <method>    Override install method (curl, npm, unknown)
  --target-version <v> Target specific version
  --help, -h           Show this help message
`);
    process.exit(0);
  }

  const methodValue = values.method as string | undefined;
  const methodOverride =
    methodValue === 'curl' || methodValue === 'npm' || methodValue === 'unknown'
      ? (methodValue as TInstallMethod)
      : undefined;

  if (methodValue && !methodOverride) {
    console.error('[Update] Invalid --method. Allowed: curl, npm, unknown');
    process.exit(1);
  }

  const progress = createUpgradeProgressRenderer();

  const result = await checkForUpgrade({
    force: true,
    checkOnly: Boolean(values.check),
    methodOverride,
    targetVersionOverride: values['target-version'] as string | undefined,
    onProgress: progress.update,
  }).finally(() => {
    progress.finish();
  });
  const currentVersion = getServerVersion();

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
