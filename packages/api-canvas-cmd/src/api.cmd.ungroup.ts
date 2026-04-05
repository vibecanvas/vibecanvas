import { fxExecuteCanvasUngroup } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.ungroup';
import { createCanvasCmdContext } from './cmd.context';
import { rethrowCanvasCmdAsOrpcError } from './cmd.error';
import { baseCanvasCmdOs } from './orpc';

const apiCmdUngroupCanvas = baseCanvasCmdOs.api.canvasCmd.ungroup.handler(async ({ input, context }) => {
  try {
    return await fxExecuteCanvasUngroup(createCanvasCmdContext(context), input);
  } catch (error) {
    rethrowCanvasCmdAsOrpcError(error);
  }
});

export { apiCmdUngroupCanvas };
