import { txExecuteCanvasAdd, type TCanvasAddInput, type TCanvasAddElementInput } from '@vibecanvas/canvas-cmds/cmds/tx.cmd.add';
import { createCanvasCmdContext } from './cmd.context';
import { rethrowCanvasCmdAsOrpcError } from './cmd.error';
import { baseCanvasCmdOs } from './orpc';

function fnAssignFreshElementIds(input: TCanvasAddInput): TCanvasAddInput {
  return {
    ...input,
    elements: (input.elements ?? []).map((element): TCanvasAddElementInput => {
      const { id: _ignoredId, ...rest } = element;
      return { ...rest, id: input.dryRun ? 'PLACEHOLDER-NO' : crypto.randomUUID() };
    }),
  };
}

const apiCmdAddCanvas = baseCanvasCmdOs.add.handler(async ({ input, context }) => {
  try {
    return await txExecuteCanvasAdd(createCanvasCmdContext(context), fnAssignFreshElementIds(input));
  } catch (error) {
    rethrowCanvasCmdAsOrpcError(error);
  }
});

export { apiCmdAddCanvas };
