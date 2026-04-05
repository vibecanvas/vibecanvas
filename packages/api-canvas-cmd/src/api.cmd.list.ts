import { fxExecuteCanvasList } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.list';
import { createCanvasCmdContext } from './cmd.context';
import { rethrowCanvasCmdAsOrpcError } from './cmd.error';
import { baseCanvasCmdOs } from './orpc';

const apiCmdListCanvas = baseCanvasCmdOs.list.handler(async ({ context }) => {
  try {
    return await fxExecuteCanvasList(createCanvasCmdContext(context));
  } catch (error) {
    rethrowCanvasCmdAsOrpcError(error);
  }
});

export { apiCmdListCanvas };
