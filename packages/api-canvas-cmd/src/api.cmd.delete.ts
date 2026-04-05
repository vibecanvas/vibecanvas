import { txExecuteCanvasDelete } from '@vibecanvas/canvas-cmds/cmds/tx.cmd.delete';
import { createCanvasCmdContext } from './cmd.context';
import { rethrowCanvasCmdAsOrpcError } from './cmd.error';
import { baseCanvasCmdOs } from './orpc';

const apiCmdDeleteCanvas = baseCanvasCmdOs.delete.handler(async ({ input, context }) => {
  try {
    return await txExecuteCanvasDelete(createCanvasCmdContext(context), input);
  } catch (error) {
    rethrowCanvasCmdAsOrpcError(error);
  }
});

export { apiCmdDeleteCanvas };
