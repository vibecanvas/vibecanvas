import { txExecuteCanvasReorder } from '@vibecanvas/canvas-cmds/cmds/tx.cmd.reorder';
import { createCanvasCmdContext } from './cmd.context';
import { rethrowCanvasCmdAsOrpcError } from './cmd.error';
import { baseCanvasCmdOs } from './orpc';

const apiCmdReorderCanvas = baseCanvasCmdOs.reorder.handler(async ({ input, context }) => {
  try {
    return await txExecuteCanvasReorder(createCanvasCmdContext(context), input);
  } catch (error) {
    rethrowCanvasCmdAsOrpcError(error);
  }
});

export { apiCmdReorderCanvas };
