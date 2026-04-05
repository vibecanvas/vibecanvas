import { fxExecuteCanvasQuery } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.query';
import { createCanvasCmdContext } from './cmd.context';
import { rethrowCanvasCmdAsOrpcError } from './cmd.error';
import { baseCanvasCmdOs } from './orpc';

const apiCmdQueryCanvas = baseCanvasCmdOs.api.canvasCmd.query.handler(async ({ input, context }) => {
  try {
    return await fxExecuteCanvasQuery(createCanvasCmdContext(context), input);
  } catch (error) {
    rethrowCanvasCmdAsOrpcError(error);
  }
});

export { apiCmdQueryCanvas };
