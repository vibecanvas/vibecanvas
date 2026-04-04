import { executeCanvasQuery } from '@vibecanvas/canvas-cmds';
import { createCanvasCmdContext } from './cmd.context';
import { rethrowCanvasCmdAsOrpcError } from './cmd.error';
import { baseCanvasOs } from './orpc';

const apiCmdQueryCanvas = baseCanvasOs.cmd.query.handler(async ({ input, context }) => {
  try {
    return await executeCanvasQuery(createCanvasCmdContext(context), input);
  } catch (error) {
    rethrowCanvasCmdAsOrpcError(error);
  }
});

export { apiCmdQueryCanvas };
