import { apiCmdListCanvas } from './api.cmd.list';
import { apiCmdMoveCanvas } from './api.cmd.move';
import { apiCmdPatchCanvas } from './api.cmd.patch';
import { apiCmdQueryCanvas } from './api.cmd.query';
import { baseCanvasCmdOs } from './orpc';

const canvasCmdHandlers = {
  api: {
    canvasCmd: {
      list: apiCmdListCanvas,
      query: apiCmdQueryCanvas,
      move: apiCmdMoveCanvas,
      patch: apiCmdPatchCanvas,
    },
  },
};

export { baseCanvasCmdOs, canvasCmdHandlers };
