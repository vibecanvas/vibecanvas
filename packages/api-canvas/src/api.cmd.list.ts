import { executeCanvasList } from '@vibecanvas/canvas-cmds';
import { createCanvasCmdContext } from './cmd.context';
import { rethrowCanvasCmdAsOrpcError } from './cmd.error';
import { baseCanvasOs } from './orpc';

const apiCmdListCanvas = baseCanvasOs.cmd.list.handler(async ({ context }) => {
  try {
    return await executeCanvasList(createCanvasCmdContext(context));
  } catch (error) {
    rethrowCanvasCmdAsOrpcError(error);
  }
});

export { apiCmdListCanvas };
