import { executeCanvasPatch } from '@vibecanvas/canvas-cmds';
import { createCanvasCmdContext } from './cmd.context';
import { rethrowCanvasCmdAsOrpcError } from './cmd.error';
import { baseCanvasCmdOs } from './orpc';

const apiCmdPatchCanvas = baseCanvasCmdOs.api.canvasCmd.patch.handler(async ({ input, context }) => {
  try {
    return await executeCanvasPatch(createCanvasCmdContext(context), input);
  } catch (error) {
    rethrowCanvasCmdAsOrpcError(error);
  }
});

export { apiCmdPatchCanvas };
