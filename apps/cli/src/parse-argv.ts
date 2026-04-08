import { parseArgs } from 'util';
import { CANVAS_SUBCOMMAND_SET } from './plugins/cli/core/constants';

type TCliCommand = 'serve' | 'canvas' | 'upgrade' | 'unknown';

type TCanvasSubcommandOptions = {
  json?: boolean;
  canvasId?: string;
  canvasNameQuery?: string;
  ids?: string[];

  output?: string;
  omitData?: boolean;
  omitStyle?: boolean;
  kinds?: string[];
  types?: string[];
  styles?: string[];
  groupId?: string;
  subtree?: string;
  bounds?: string;
  boundsMode?: string;
  where?: string;
  queryJson?: string;

  relative?: boolean;
  absolute?: boolean;
  x?: string;
  y?: string;

  patch?: string;
  patchFile?: string;
  patchStdin?: boolean;

  action?: string;
};

class CliArgvError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'CliArgvError';
    this.code = code;
  }
}

type TCliParsedArgv = {
  rawArgv: string[];
  argv: string[];
  command: TCliCommand;
  subcommand?: string;
  port?: number;
  dbPath?: string;
  helpRequested: boolean;
  versionRequested: boolean;
  upgradeTarget?: string;
  subcommandOptions?: TCanvasSubcommandOptions;
};

function getDefaultCommand(commandToken: string | undefined): TCliCommand {
  if (commandToken === 'canvas') return 'canvas';
  if (commandToken === 'upgrade') return 'upgrade';
  if (commandToken === undefined || /^\d+$/.test(commandToken)) return 'serve';
  if (commandToken === 'serve') return 'serve';
  if (commandToken.startsWith('-')) return 'serve';
  if (CANVAS_SUBCOMMAND_SET.has(commandToken)) return 'canvas';
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

function validateOptionValue(flag: string, value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (value.trim().length === 0) {
    throw new CliArgvError('CLI_FLAG_EMPTY_VALUE', `${flag} requires a non-empty value.`);
  }
  if (value.startsWith('-')) {
    throw new CliArgvError('DB_FLAG_MISSING_VALUE', `${flag} requires a path value. Received option token '${value}' instead.`);
  }
  return value;
}

function normalizeMultiStringOption(value: unknown): string[] {
  if (value === undefined) return [];
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }
  return typeof value === 'string' ? [value] : [];
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

      json: { type: 'boolean', default: false },
      canvas: { type: 'string' },
      'canvas-name': { type: 'string' },
      id: { type: 'string', multiple: true },

      output: { type: 'string' },
      omitdata: { type: 'boolean', default: false },
      omitstyle: { type: 'boolean', default: false },
      kind: { type: 'string', multiple: true },
      type: { type: 'string', multiple: true },
      style: { type: 'string', multiple: true },
      group: { type: 'string' },
      subtree: { type: 'string' },
      bounds: { type: 'string' },
      'bounds-mode': { type: 'string' },
      where: { type: 'string' },
      query: { type: 'string' },

      relative: { type: 'boolean', default: false },
      absolute: { type: 'boolean', default: false },
      x: { type: 'string' },
      y: { type: 'string' },

      patch: { type: 'string' },
      'patch-file': { type: 'string' },
      'patch-stdin': { type: 'boolean', default: false },

      action: { type: 'string' },
    },
  });

  const commandToken = positionals[2];
  const command = getDefaultCommand(commandToken);
  const subcommand = command === 'canvas'
    ? commandToken === 'canvas'
      ? positionals[3]
      : commandToken
    : command === 'unknown'
      ? commandToken
      : undefined;

  const ids = normalizeMultiStringOption(values.id).flatMap((value) => value.split(','));
  const kinds = normalizeMultiStringOption(values.kind);
  const types = normalizeMultiStringOption(values.type);
  const styles = normalizeMultiStringOption(values.style);

  return {
    rawArgv: [...rawArgv],
    argv,
    command,
    subcommand,
    port: parsePort(typeof values.port === 'string' ? values.port : /^\d+$/.test(commandToken ?? '') ? commandToken : undefined),
    dbPath: validateOptionValue('--db', typeof values.db === 'string' ? values.db : undefined),
    helpRequested: values.help === true,
    versionRequested: values.version === true,
    upgradeTarget: typeof values.upgrade === 'string' ? values.upgrade : undefined,
    subcommandOptions: {
      json: values.json === true,
      canvasId: typeof values.canvas === 'string' ? values.canvas : undefined,
      canvasNameQuery: typeof values['canvas-name'] === 'string' ? values['canvas-name'] : undefined,
      ids,
      output: typeof values.output === 'string' ? values.output : undefined,
      omitData: values.omitdata === true,
      omitStyle: values.omitstyle === true,
      kinds,
      types,
      styles,
      groupId: typeof values.group === 'string' ? values.group : undefined,
      subtree: typeof values.subtree === 'string' ? values.subtree : undefined,
      bounds: typeof values.bounds === 'string' ? values.bounds : undefined,
      boundsMode: typeof values['bounds-mode'] === 'string' ? values['bounds-mode'] : undefined,
      where: typeof values.where === 'string' ? values.where : undefined,
      queryJson: typeof values.query === 'string' ? values.query : undefined,
      relative: values.relative === true,
      absolute: values.absolute === true,
      x: typeof values.x === 'string' ? values.x : undefined,
      y: typeof values.y === 'string' ? values.y : undefined,
      patch: typeof values.patch === 'string' ? values.patch : undefined,
      patchFile: typeof values['patch-file'] === 'string' ? values['patch-file'] : undefined,
      patchStdin: values['patch-stdin'] === true,
      action: typeof values.action === 'string' ? values.action : undefined,
    },
  };
}

export { CliArgvError, parseCliArgv };
export type { TCliCommand, TCliParsedArgv, TCanvasSubcommandOptions };
