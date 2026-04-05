import { fxExecuteCanvasAdd } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.add';
import { createCanvasCmdContext } from './cmd.context';
import { rethrowCanvasCmdAsOrpcError } from './cmd.error';
import { baseCanvasCmdOs } from './orpc';

const apiCmdAddCanvas = baseCanvasCmdOs.api.canvasCmd.add.handler(async ({ input, context }) => {
  try {
    return await fxExecuteCanvasAdd(createCanvasCmdContext(context), input);
  } catch (error) {
    rethrowCanvasCmdAsOrpcError(error);
  }
});

export { apiCmdAddCanvas };
