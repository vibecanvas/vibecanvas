import { txExecuteCanvasMove } from '@vibecanvas/canvas-cmds/cmds/tx.cmd.move';
import { createCanvasCmdContext } from './cmd.context';
import { rethrowCanvasCmdAsOrpcError } from './cmd.error';
import { baseCanvasCmdOs } from './orpc';

const apiCmdMoveCanvas = baseCanvasCmdOs.move.handler(async ({ input, context }) => {
  try {
    return await txExecuteCanvasMove(createCanvasCmdContext(context), input);
  } catch (error) {
    rethrowCanvasCmdAsOrpcError(error);
  }
});

export { apiCmdMoveCanvas };
