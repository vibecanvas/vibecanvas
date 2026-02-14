#!/usr/bin/env bun
// CLI entry point for vibecanvas
// Supports subcommands: serve (default), upgrade
import './preload/patch-negative-timeout';
import { parseArgs } from 'util';
import { getServerVersion } from './runtime';

function printHelp(): void {
  console.log(`vibecanvas - Run your agents in an infinite canvas

Usage:
  vibecanvas [command] [options]

Commands:
  serve     Start the vibecanvas server (default when no command given)
  upgrade   Check for and install updates

Options:
  --port <number>   Port for server (default: 3000 dev, 7496 compiled)
  --version, -v     Print version and exit
  --help, -h        Show this help message

Examples:
  vibecanvas                    Start server on default port
  vibecanvas serve --port 3001  Start server on port 3001
  vibecanvas upgrade            Check for and install updates
  vibecanvas upgrade --check    Check for updates without installing
  vibecanvas --version          Print version
`);
}

async function main() {
  const argv = Bun.argv;

  // Top-level parse for --version and --help
  const { values, positionals } = parseArgs({
    args: argv,
    strict: false,
    allowPositionals: true,
    options: {
      version: {
        type: 'boolean',
        short: 'v',
        default: false,
      },
      help: {
        type: 'boolean',
        short: 'h',
        default: false,
      },
      port: {
        type: 'string',
      },
    },
  });

  // Extract subcommand (positionals[0] is bun path, [1] is script path, [2] is first arg)
  const subcommand = positionals[2];

  // If a subcommand is provided, let it handle its own --help
  if (subcommand === 'upgrade') {
    const { runUpgrade } = await import('./cmd.upgrade');
    await runUpgrade(argv);
    // runUpgrade always exits, but TypeScript needs this
    console.log("Upgrade completed")
    process.exit(1);
  }

  // Top-level --help and --version (only when no subcommand or 'serve')
  if (values.version) {
    console.log(getServerVersion());
    process.exit(0);
  }

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  // Handle serve subcommand (or default when no subcommand)
  if (subcommand === 'serve' || subcommand === undefined || /^\d+$/.test(subcommand)) {
    // Re-parse for serve-specific options
    let port: number;

    if (subcommand === 'serve') {
      // Explicit 'serve' command - look for --port flag
      port = typeof values.port === 'string' ? parseInt(values.port, 10) : getDefaultPort();
    } else if (subcommand === undefined) {
      // No subcommand - use --port flag or default
      port = typeof values.port === 'string' ? parseInt(values.port, 10) : getDefaultPort();
    } else {
      // Positional number treated as port (backward compat)
      port = parseInt(subcommand, 10);
    }

    if (!Number.isFinite(port) || port < 1 || port > 65535) {
      console.error(`Invalid port: ${values.port ?? subcommand}`);
      process.exit(1);
    }

    const { startServer } = await import('./server');
    await startServer({ port });
    return;
  }

  // Unknown subcommand
  console.error(`Unknown command: ${subcommand}`);
  printHelp();
  process.exit(1);
}

function getDefaultPort(): number {
  return VIBECANVAS_COMPILED ? 7496 : 3000;
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
