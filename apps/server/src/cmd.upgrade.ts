import { parseArgs } from 'util';
import checkForUpgrade from './update';
import type { TInstallMethod } from './update/types';
import { getCliArgv, getServerVersion } from './runtime';

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

  const result = await checkForUpgrade({
    force: true,
    checkOnly: Boolean(values.check),
    methodOverride,
    targetVersionOverride: values['target-version'] as string | undefined,
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
