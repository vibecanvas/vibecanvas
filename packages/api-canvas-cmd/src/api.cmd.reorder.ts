import { fxExecuteCanvasReorder } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.reorder';
import { createCanvasCmdContext } from './cmd.context';
import { rethrowCanvasCmdAsOrpcError } from './cmd.error';
import { baseCanvasCmdOs } from './orpc';

const apiCmdReorderCanvas = baseCanvasCmdOs.api.canvasCmd.reorder.handler(async ({ input, context }) => {
  try {
    return await fxExecuteCanvasReorder(createCanvasCmdContext(context), input);
  } catch (error) {
    rethrowCanvasCmdAsOrpcError(error);
  }
});

export { apiCmdReorderCanvas };
