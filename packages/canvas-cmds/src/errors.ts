export type TCanvasCmdErrorDetails = {
  ok: false;
  command: string;
  code: string;
  message: string;
  canvasId?: string | null;
  canvasNameQuery?: string | null;
  dbPath?: string;
  matches?: Array<{ id: string; name: string }>;
};

class CanvasCmdError extends Error {
  readonly details: TCanvasCmdErrorDetails;

  constructor(details: TCanvasCmdErrorDetails) {
    super(details.message);
    this.name = 'CanvasCmdError';
    this.details = details;
  }
}

function throwCanvasCmdError(details: TCanvasCmdErrorDetails): never {
  throw new CanvasCmdError(details);
}

function isCanvasCmdError(value: unknown): value is CanvasCmdError {
  return value instanceof CanvasCmdError;
}

function toCanvasCmdError(args: {
  command: string;
  code: string;
  message: string;
  canvasId?: string | null;
  canvasNameQuery?: string | null;
  dbPath?: string;
  matches?: Array<{ id: string; name: string }>;
}): CanvasCmdError {
  return new CanvasCmdError({
    ok: false,
    command: args.command,
    code: args.code,
    message: args.message,
    canvasId: args.canvasId,
    canvasNameQuery: args.canvasNameQuery,
    dbPath: args.dbPath,
    matches: args.matches,
  });
}

export { CanvasCmdError, isCanvasCmdError, throwCanvasCmdError, toCanvasCmdError };
