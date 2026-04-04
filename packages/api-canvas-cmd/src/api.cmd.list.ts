import { executeCanvasList } from '@vibecanvas/canvas-cmds';
import { createCanvasCmdContext } from './cmd.context';
import { rethrowCanvasCmdAsOrpcError } from './cmd.error';
import { baseCanvasCmdOs } from './orpc';

const apiCmdListCanvas = baseCanvasCmdOs.api.canvasCmd.list.handler(async ({ context }) => {
  try {
    return await executeCanvasList(createCanvasCmdContext(context));
  } catch (error) {
    rethrowCanvasCmdAsOrpcError(error);
  }
});

export { apiCmdListCanvas };
