import { fxExecuteCanvasGroup } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.group';
import { createCanvasCmdContext } from './cmd.context';
import { rethrowCanvasCmdAsOrpcError } from './cmd.error';
import { baseCanvasCmdOs } from './orpc';

const apiCmdGroupCanvas = baseCanvasCmdOs.group.handler(async ({ input, context }) => {
  try {
    return await fxExecuteCanvasGroup(createCanvasCmdContext(context), input);
  } catch (error) {
    rethrowCanvasCmdAsOrpcError(error);
  }
});

export { apiCmdGroupCanvas };
