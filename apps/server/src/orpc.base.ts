import { implement, onError, ORPCError } from "@orpc/server";
import contract from "@vibecanvas/core-contract";
import db from "@vibecanvas/shell/database/db";
import { OpencodeService } from "@vibecanvas/shell/opencode/srv.opencode";
import { tExternal, tInternal } from "./error-fn";

function isErrorEntry(value: unknown): value is TErrorEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof (value as TErrorEntry).code === 'string' &&
    'statusCode' in value &&
    typeof (value as TErrorEntry).statusCode === 'number'
  );
}

function isORPCError(value: unknown): value is ORPCError<string, unknown> {
  return value instanceof ORPCError
}

export const baseOs = implement({ api: contract })
  .$context<{ db: typeof db, opencodeService: OpencodeService }>()
  .use(onError((error) => {
    if (isErrorEntry(error)) {
      const msg = tExternal(error, 'en')
      if (error.shouldLogInternally) {
        console.error(tInternal(error))
      }
      throw new ORPCError(error.code, { message: msg })
    } else if (isORPCError(error)) {
      console.error(error)
      throw new ORPCError(error.code, { message: error.message })
    } else {
      console.error(error)
      throw new ORPCError('UNKNOWN', { message: 'Unknown error' })
    }
  }))

