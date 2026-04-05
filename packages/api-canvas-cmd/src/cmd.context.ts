import type { TPortal as TCanvasAddPortal } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.add';
import type { TPortal as TCanvasDeletePortal } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.delete';
import type { TPortal as TCanvasGroupPortal } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.group';
import type { TPortal as TCanvasListPortal } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.list';
import type { TPortal as TCanvasMovePortal } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.move';
import type { TPortal as TCanvasPatchPortal } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.patch';
import type { TPortal as TCanvasQueryPortal } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.query';
import type { TPortal as TCanvasReorderPortal } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.reorder';
import type { TPortal as TCanvasUngroupPortal } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.ungroup';
import type { TCanvasCmdApiContext } from './types';

type TCanvasCmdPortal =
  & TCanvasListPortal
  & TCanvasQueryPortal
  & TCanvasPatchPortal
  & TCanvasMovePortal
  & TCanvasGroupPortal
  & TCanvasUngroupPortal
  & TCanvasDeletePortal
  & TCanvasReorderPortal
  & TCanvasAddPortal;

function createCanvasCmdContext(context: TCanvasCmdApiContext): TCanvasCmdPortal {
  return {
    dbService: context.db,
    automergeService: context.automerge,
  };
}

export { createCanvasCmdContext };
export type { TCanvasCmdPortal };
