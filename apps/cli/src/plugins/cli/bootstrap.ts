import { resolve } from 'node:path';

type TBootstrapSuccess = {
  ok: true;
  dbPath: string | null;
};

type TBootstrapFailure = {
  ok: false;
  code: 'DB_FLAG_MISSING_VALUE' | 'DB_FLAG_DUPLICATE';
  message: string;
  json: boolean;
};

type TBootstrapResult = TBootstrapSuccess | TBootstrapFailure;

function hasCanvasCommand(argv: readonly string[]): boolean {
  return argv[2] === 'canvas';
}

function hasJsonFlag(argv: readonly string[]): boolean {
  return argv.includes('--json');
}

function resolveCanvasCliBootstrap(argv: readonly string[], cwd = process.cwd()): TBootstrapResult {
  let resolvedDbPath: string | null = null;

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--db') {
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) {
        return {
          ok: false,
          code: 'DB_FLAG_MISSING_VALUE',
          message: 'Missing value for --db. Pass an explicit SQLite file path.',
          json: hasCanvasCommand(argv) && hasJsonFlag(argv),
        };
      }

      if (resolvedDbPath) {
        return {
          ok: false,
          code: 'DB_FLAG_DUPLICATE',
          message: 'Duplicate --db flags are not allowed. Pass exactly one explicit SQLite file path.',
          json: hasCanvasCommand(argv) && hasJsonFlag(argv),
        };
      }

      resolvedDbPath = resolve(cwd, next);
      i += 1;
      continue;
    }

    if (!arg?.startsWith('--db=')) {
      continue;
    }

    if (resolvedDbPath) {
      return {
        ok: false,
        code: 'DB_FLAG_DUPLICATE',
        message: 'Duplicate --db flags are not allowed. Pass exactly one explicit SQLite file path.',
        json: hasCanvasCommand(argv) && hasJsonFlag(argv),
      };
    }

    const inlineValue = arg.slice('--db='.length);
    if (!inlineValue) {
      return {
        ok: false,
        code: 'DB_FLAG_MISSING_VALUE',
        message: 'Missing value for --db. Pass an explicit SQLite file path.',
        json: hasCanvasCommand(argv) && hasJsonFlag(argv),
      };
    }

    resolvedDbPath = resolve(cwd, inlineValue);
  }

  if (resolvedDbPath) {
    process.env.VIBECANVAS_DB = resolvedDbPath;
  }

  return { ok: true, dbPath: resolvedDbPath };
}

export { hasCanvasCommand, resolveCanvasCliBootstrap };
export type { TBootstrapFailure, TBootstrapResult };
