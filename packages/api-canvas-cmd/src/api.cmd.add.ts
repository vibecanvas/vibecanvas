import { txExecuteCanvasAdd } from '@vibecanvas/canvas-cmds/cmds/tx.cmd.add';
import { createCanvasCmdContext } from './cmd.context';
import { rethrowCanvasCmdAsOrpcError } from './cmd.error';
import { baseCanvasCmdOs } from './orpc';

const apiCmdAddCanvas = baseCanvasCmdOs.add.handler(async ({ input, context }) => {
  try {
    return await txExecuteCanvasAdd(createCanvasCmdContext(context), input);
  } catch (error) {
    rethrowCanvasCmdAsOrpcError(error);
  }
});

export { apiCmdAddCanvas };
