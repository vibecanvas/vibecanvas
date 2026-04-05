import { oc, populateContractRouterPaths, type as orpcType } from '@orpc/contract';
import type { TCanvasAddInput, TCanvasAddSuccess } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.add';
import type { TCanvasDeleteInput, TCanvasDeleteSuccess } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.delete';
import type { TCanvasGroupInput, TCanvasGroupSuccess } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.group';
import type { TCanvasListSuccess } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.list';
import type { TCanvasMoveInput, TCanvasMoveSuccess } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.move';
import type { TCanvasPatchInput, TCanvasPatchSuccess } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.patch';
import type { TCanvasQueryInput, TCanvasQuerySuccess } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.query';
import type { TCanvasReorderInput, TCanvasReorderSuccess } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.reorder';
import type { TCanvasUngroupInput, TCanvasUngroupSuccess } from '@vibecanvas/canvas-cmds/cmds/fx.cmd.ungroup';

const canvasCmdContract = oc.router({
  list: oc.output(orpcType<TCanvasListSuccess>()),
  query: oc.input(orpcType<TCanvasQueryInput>()).output(orpcType<TCanvasQuerySuccess>()),
  patch: oc.input(orpcType<TCanvasPatchInput>()).output(orpcType<TCanvasPatchSuccess>()),
  move: oc.input(orpcType<TCanvasMoveInput>()).output(orpcType<TCanvasMoveSuccess>()),
  group: oc.input(orpcType<TCanvasGroupInput>()).output(orpcType<TCanvasGroupSuccess>()),
  ungroup: oc.input(orpcType<TCanvasUngroupInput>()).output(orpcType<TCanvasUngroupSuccess>()),
  delete: oc.input(orpcType<TCanvasDeleteInput>()).output(orpcType<TCanvasDeleteSuccess>()),
  reorder: oc.input(orpcType<TCanvasReorderInput>()).output(orpcType<TCanvasReorderSuccess>()),
  add: oc.input(orpcType<TCanvasAddInput>()).output(orpcType<TCanvasAddSuccess>()),
});

const canvasCmdApiContract = populateContractRouterPaths(
  oc.router(canvasCmdContract),
);

export { canvasCmdContract, canvasCmdApiContract };
