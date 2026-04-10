import type { TCanvasCmdErrorDetails } from '@vibecanvas/canvas-cmds/types';
import { ORPCError } from '@orpc/server';

function isCanvasCmdErrorDetails(error: unknown): error is TCanvasCmdErrorDetails {
  return typeof error === 'object' && error !== null && 'ok' in error && 'code' in error && 'message' in error && (error as { ok?: unknown }).ok === false;
}

function resolveCanvasCmdErrorCode(code: string): 'BAD_REQUEST' | 'NOT_FOUND' | 'INTERNAL_SERVER_ERROR' {
  if (code.includes('NOT_FOUND')) return 'NOT_FOUND';
  if (code.includes('FAILED') || code.includes('BOOTSTRAP')) return 'INTERNAL_SERVER_ERROR';
  return 'BAD_REQUEST';
}

function rethrowCanvasCmdAsOrpcError(error: unknown): never {
  if (isCanvasCmdErrorDetails(error)) {
    throw new ORPCError(resolveCanvasCmdErrorCode(error.code), {
      message: error.message,
      cause: error,
    });
  }

  throw new ORPCError('INTERNAL_SERVER_ERROR', {
    message: error instanceof Error ? error.message : String(error),
    cause: error,
  });
}

export { rethrowCanvasCmdAsOrpcError };
