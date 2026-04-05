import { apiCmdAddCanvas } from './api.cmd.add';
import { apiCmdDeleteCanvas } from './api.cmd.delete';
import { apiCmdGroupCanvas } from './api.cmd.group';
import { apiCmdListCanvas } from './api.cmd.list';
import { apiCmdMoveCanvas } from './api.cmd.move';
import { apiCmdPatchCanvas } from './api.cmd.patch';
import { apiCmdQueryCanvas } from './api.cmd.query';
import { apiCmdReorderCanvas } from './api.cmd.reorder';
import { apiCmdUngroupCanvas } from './api.cmd.ungroup';
import { baseCanvasCmdOs } from './orpc';

const canvasCmdHandlers = {
  api: {
    canvasCmd: {
      list: apiCmdListCanvas,
      query: apiCmdQueryCanvas,
      patch: apiCmdPatchCanvas,
      move: apiCmdMoveCanvas,
      group: apiCmdGroupCanvas,
      ungroup: apiCmdUngroupCanvas,
      delete: apiCmdDeleteCanvas,
      reorder: apiCmdReorderCanvas,
      add: apiCmdAddCanvas,
    },
  },
};

export { baseCanvasCmdOs, canvasCmdHandlers };
