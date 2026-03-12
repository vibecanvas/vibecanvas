import type { TInputSystem } from "./input-manager";
import type { TCanvasInputContext } from "./input-systems.types";

function createPanSystem(): TInputSystem<TCanvasInputContext> {
  let isSpacePressed = false;
  let startPointer: { x: number; y: number } | null = null;
  let startCameraPosition: { x: number; y: number } | null = null;

  return {
    name: "pan",
    priority: 10,
    canStart: (context, event) => {
      const isMiddleMouse = event.evt instanceof MouseEvent && event.evt.button === 1;
      return isMiddleMouse || isSpacePressed || context.data.getActiveTool() === "hand";
    },
    onStart: (context) => {
      const pointer = context.getPointerPosition();
      if (!pointer) return;

      startPointer = pointer;
      startCameraPosition = context.data.camera.state;
    },
    onMove: (context) => {
      if (!startPointer || !startCameraPosition) return;

      const pointer = context.getPointerPosition();
      if (!pointer) return;

      context.data.camera.setPosition({
        x: startCameraPosition.x + (pointer.x - startPointer.x),
        y: startCameraPosition.y + (pointer.y - startPointer.y),
      });
      context.stage.batchDraw();
    },
    onWheel: (context, event) => {
      if (event.evt.ctrlKey) return;

      event.evt.preventDefault();

      context.data.camera.panBy({
        x: -event.evt.deltaX,
        y: -event.evt.deltaY,
      });

      context.stage.batchDraw();
    },
    onEnd: () => {
      startPointer = null;
      startCameraPosition = null;
    },
    onCancel: () => {
      startPointer = null;
      startCameraPosition = null;
    },
    onKeyDown: (_context, event) => {
      if (event.code === "Space") {
        isSpacePressed = true;
        event.preventDefault();
      }
    },
    onKeyUp: (_context, event) => {
      if (event.code === "Space") {
        isSpacePressed = false;
        event.preventDefault();
      }
    },
    getCursor: (context) => {
      if (context.activeSystemName === "pan") return "grabbing";
      if (isSpacePressed || context.data.getActiveTool() === "hand") return "grab";
      return null;
    },
  };
}

export { createPanSystem };
