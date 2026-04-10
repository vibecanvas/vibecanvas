import { txExecuteCanvasUngroup } from '@vibecanvas/canvas-cmds/cmds/tx.cmd.ungroup';
import { createCanvasCmdContext } from './cmd.context';
import { rethrowCanvasCmdAsOrpcError } from './cmd.error';
import { baseCanvasCmdOs } from './orpc';

const apiCmdUngroupCanvas = baseCanvasCmdOs.ungroup.handler(async ({ input, context }) => {
  try {
    return await txExecuteCanvasUngroup(createCanvasCmdContext(context), input);
  } catch (error) {
    rethrowCanvasCmdAsOrpcError(error);
  }
});

export { apiCmdUngroupCanvas };
