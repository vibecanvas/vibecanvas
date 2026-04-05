import { fxExecuteCanvasMove } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.move';
import { createCanvasCmdContext } from './cmd.context';
import { rethrowCanvasCmdAsOrpcError } from './cmd.error';
import { baseCanvasCmdOs } from './orpc';

const apiCmdMoveCanvas = baseCanvasCmdOs.api.canvasCmd.move.handler(async ({ input, context }) => {
  try {
    return await fxExecuteCanvasMove(createCanvasCmdContext(context), input);
  } catch (error) {
    rethrowCanvasCmdAsOrpcError(error);
  }
});

export { apiCmdMoveCanvas };
