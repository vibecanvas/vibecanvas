import { fxExecuteCanvasDelete } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.delete';
import { createCanvasCmdContext } from './cmd.context';
import { rethrowCanvasCmdAsOrpcError } from './cmd.error';
import { baseCanvasCmdOs } from './orpc';

const apiCmdDeleteCanvas = baseCanvasCmdOs.api.canvasCmd.delete.handler(async ({ input, context }) => {
  try {
    return await fxExecuteCanvasDelete(createCanvasCmdContext(context), input);
  } catch (error) {
    rethrowCanvasCmdAsOrpcError(error);
  }
});

export { apiCmdDeleteCanvas };
