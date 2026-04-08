import { parseArgs } from 'util';
import { CANVAS_SUBCOMMAND_SET } from './plugins/cli/core/constants';

type TCliCommand = 'serve' | 'canvas' | 'upgrade' | 'unknown';

type TCanvasSubcommandOptions = {
  json?: boolean;
  schema?: boolean | string;
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

  elementJsons?: string[];
  elementsFile?: string;
  elementsStdin?: boolean;
  rects?: string[];
  ellipses?: string[];
  diamonds?: string[];
  texts?: string[];
  lines?: string[];
  arrows?: string[];

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

function parseSchemaOption(argv: readonly string[]): boolean | string | undefined {
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) continue;
    if (token === '--schema') {
      const next = argv[index + 1];
      return next && !next.startsWith('-') ? next : true;
    }
    if (token.startsWith('--schema=')) {
      const value = token.slice('--schema='.length).trim();
      return value.length > 0 ? value : true;
    }
  }
  return undefined;
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
      schema: { type: 'boolean', default: false },
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

      element: { type: 'string', multiple: true },
      'elements-file': { type: 'string' },
      'elements-stdin': { type: 'boolean', default: false },
      rect: { type: 'string', multiple: true },
      ellipse: { type: 'string', multiple: true },
      diamond: { type: 'string', multiple: true },
      text: { type: 'string', multiple: true },
      line: { type: 'string', multiple: true },
      arrow: { type: 'string', multiple: true },

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
  const elementJsons = normalizeMultiStringOption(values.element);
  const rects = normalizeMultiStringOption(values.rect);
  const ellipses = normalizeMultiStringOption(values.ellipse);
  const diamonds = normalizeMultiStringOption(values.diamond);
  const texts = normalizeMultiStringOption(values.text);
  const lines = normalizeMultiStringOption(values.line);
  const arrows = normalizeMultiStringOption(values.arrow);

  const schema = parseSchemaOption(argv);

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
      schema,
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
      elementJsons,
      elementsFile: typeof values['elements-file'] === 'string' ? values['elements-file'] : undefined,
      elementsStdin: values['elements-stdin'] === true,
      rects,
      ellipses,
      diamonds,
      texts,
      lines,
      arrows,
      patch: typeof values.patch === 'string' ? values.patch : undefined,
      patchFile: typeof values['patch-file'] === 'string' ? values['patch-file'] : undefined,
      patchStdin: values['patch-stdin'] === true,
      action: typeof values.action === 'string' ? values.action : undefined,
    },
  };
}

export { CliArgvError, parseCliArgv };
export type { TCliCommand, TCliParsedArgv, TCanvasSubcommandOptions };
