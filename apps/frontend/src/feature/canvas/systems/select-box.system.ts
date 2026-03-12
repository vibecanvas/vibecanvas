import Konva from "konva";
import type { TInputSystem } from "../managers/input.manager";
import type { TCanvasInputContext } from "../service/input-systems.types";

function createSelectBoxSystem(): TInputSystem<TCanvasInputContext> {
  let origin: { x: number; y: number } | null = null;

  const hideSelectionRect = (context: { data: TCanvasInputContext }) => {
    context.data.selectionRect.visible(false);
    context.data.overlayLayer.batchDraw();
  };

  return {
    name: "select-box",
    priority: 20,
    canStart: (context, event) => {
      return context.data.getActiveTool() === "select" && event.target === context.stage;
    },
    onStart: (context) => {
      const pointer = context.getPointerPosition();
      if (!pointer) return;

      origin = context.data.camera.screenToWorld(pointer);
      context.data.selectionRect.setAttrs({
        x: origin.x,
        y: origin.y,
        width: 0,
        height: 0,
        visible: true,
      });
      context.data.setSelectedIds([]);
      context.data.overlayLayer.batchDraw();
    },
    onMove: (context) => {
      if (!origin) return;

      const pointer = context.getPointerPosition();
      if (!pointer) return;

      const worldPointer = context.data.camera.screenToWorld(pointer);

      context.data.selectionRect.setAttrs({
        x: Math.min(origin.x, worldPointer.x),
        y: Math.min(origin.y, worldPointer.y),
        width: Math.abs(worldPointer.x - origin.x),
        height: Math.abs(worldPointer.y - origin.y),
      });

      const selectionBounds = context.data.selectionRect.getClientRect();
      const selectedIds = context.data
        .getSelectableNodes()
        .filter((node) => node.id())
        .filter((node) => Konva.Util.haveIntersection(selectionBounds, node.getClientRect()))
        .map((node) => node.id());

      context.data.setSelectedIds(selectedIds);
      context.data.overlayLayer.batchDraw();
    },
    onEnd: (context) => {
      origin = null;
      hideSelectionRect(context);
    },
    onCancel: (context) => {
      origin = null;
      hideSelectionRect(context);
    },
    getCursor: (context) => {
      if (context.activeSystemName === "select-box") return "crosshair";
      if (context.data.getActiveTool() === "select") return "default";
      return null;
    },
  };
}

export { createSelectBoxSystem };
