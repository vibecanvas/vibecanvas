import type { TInputSystem } from "../managers/input.manager";
import type { TCanvasInputContext } from "../service/input-systems.types";

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const ZOOM_STEP = 1.08;

/**
 * Handles camera zooming from wheel gestures.
 *
 * This system only claims `ctrl+wheel` gestures. Returning `false` for normal
 * wheel input lets lower-priority systems, such as pan, handle touchpad scrolling.
 */
function clampScale(scale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

function createZoomSystem(): TInputSystem<TCanvasInputContext> {
  return {
    name: "zoom",
    priority: 30,
    onWheel: (context, event) => {
      if (!event.evt.ctrlKey) return false;

      const pointer = context.getPointerPosition();
      if (!pointer) return false;

      event.evt.preventDefault();

      const currentScale = context.data.camera.state.scale;
      const direction = event.evt.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
      const nextScale = clampScale(currentScale * direction);

      if (nextScale === currentScale) return true;

      context.data.camera.zoomAtScreenPoint({
        scale: nextScale,
        screenPoint: pointer,
      });

      context.stage.batchDraw();
      return true;
    },
  };
}

export { createZoomSystem };
