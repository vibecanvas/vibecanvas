import { executeCanvasMove } from '@vibecanvas/canvas-cmds';
import { createCanvasCmdContext } from './cmd.context';
import { rethrowCanvasCmdAsOrpcError } from './cmd.error';
import { baseCanvasCmdOs } from './orpc';

const apiCmdMoveCanvas = baseCanvasCmdOs.api.canvasCmd.move.handler(async ({ input, context }) => {
  try {
    return await executeCanvasMove(createCanvasCmdContext(context), input);
  } catch (error) {
    rethrowCanvasCmdAsOrpcError(error);
  }
});

export { apiCmdMoveCanvas };
