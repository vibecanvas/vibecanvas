import { parseArgs } from 'util';

type TCliCommand = 'serve' | 'canvas' | 'upgrade' | 'unknown';

type TCliParsedArgv = {
  rawArgv: string[];
  argv: string[];
  command: TCliCommand;
  port?: number;
  dbPath?: string;
  helpRequested: boolean;
  versionRequested: boolean;
  upgradeTarget?: string;
  subcommand?: string;
};

function getDefaultCommand(subcommand: string | undefined): TCliCommand {
  if (subcommand === 'canvas') return 'canvas';
  if (subcommand === 'upgrade') return 'upgrade';
  if (subcommand === undefined || /^\d+$/.test(subcommand)) return 'serve';
  if (subcommand === 'serve') return 'serve';
  if (subcommand.startsWith('-')) return 'serve';
  return 'unknown';
}

function parsePort(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const port = Number.parseInt(value, 10);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${value}`);
  }
  return port;
}

function parseCliArgv(rawArgv: readonly string[] = Bun.argv): TCliParsedArgv {
  const argv = [...rawArgv];
  const { values, positionals } = parseArgs({
    args: argv,
    strict: false,
    allowPositionals: true,
    options: {
      version: { type: 'boolean', short: 'v', default: false },
      help: { type: 'boolean', short: 'h', default: false },
      port: { type: 'string' },
      db: { type: 'string' },
      upgrade: { type: 'string' },
    },
  });

  const subcommand = positionals[2];

  return {
    rawArgv: [...rawArgv],
    argv,
    command: getDefaultCommand(subcommand),
    port: parsePort(typeof values.port === 'string' ? values.port : /^\d+$/.test(subcommand ?? '') ? subcommand : undefined),
    dbPath: typeof values.db === 'string' ? values.db : undefined,
    helpRequested: values.help === true,
    versionRequested: values.version === true,
    upgradeTarget: typeof values.upgrade === 'string' ? values.upgrade : undefined,
    subcommand,
  };
}

export { parseCliArgv };
export type { TCliCommand, TCliParsedArgv };
