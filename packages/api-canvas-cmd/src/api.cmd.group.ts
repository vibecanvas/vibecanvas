import { txExecuteCanvasGroup } from '@vibecanvas/canvas-cmds/cmds/tx.cmd.group';
import { createCanvasCmdContext } from './cmd.context';
import { rethrowCanvasCmdAsOrpcError } from './cmd.error';
import { baseCanvasCmdOs } from './orpc';

const apiCmdGroupCanvas = baseCanvasCmdOs.group.handler(async ({ input, context }) => {
  try {
    return await txExecuteCanvasGroup(createCanvasCmdContext(context), input);
  } catch (error) {
    rethrowCanvasCmdAsOrpcError(error);
  }
});

export { apiCmdGroupCanvas };
