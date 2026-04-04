import { CanvasCmdError, isCanvasCmdError } from '@vibecanvas/canvas-cmds';
import { ORPCError } from '@orpc/server';

function resolveCanvasCmdErrorCode(code: string): 'BAD_REQUEST' | 'NOT_FOUND' | 'INTERNAL_SERVER_ERROR' {
  if (code.includes('NOT_FOUND')) return 'NOT_FOUND';
  if (code.includes('FAILED') || code.includes('BOOTSTRAP')) return 'INTERNAL_SERVER_ERROR';
  return 'BAD_REQUEST';
}

function rethrowCanvasCmdAsOrpcError(error: unknown): never {
  if (isCanvasCmdError(error)) {
    throw new ORPCError(resolveCanvasCmdErrorCode(error.details.code), {
      message: error.details.message,
      cause: error,
    });
  }

  if (error instanceof CanvasCmdError) {
    throw new ORPCError(resolveCanvasCmdErrorCode(error.details.code), {
      message: error.details.message,
      cause: error,
    });
  }

  throw new ORPCError('INTERNAL_SERVER_ERROR', {
    message: error instanceof Error ? error.message : String(error),
    cause: error,
  });
}

export { rethrowCanvasCmdAsOrpcError };
