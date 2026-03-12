import type { TCanvasInputContext } from "../types/canvas-context.types";
import { AbstractCanvasSystem } from "./system.abstract";
import type { TCanvasSystemInputContext } from "./system.abstract";

type TZoomState = Record<string, never>;

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

class ZoomSystem extends AbstractCanvasSystem<TCanvasInputContext, TZoomState> {
  readonly name = "zoom";

  readonly input: AbstractCanvasSystem<TCanvasInputContext, TZoomState>["input"];

  constructor() {
    super({ priority: 30, state: {} });

    this.input = {
      onWheel: this.onWheel.bind(this),
    };
  }

  private onWheel(context: TCanvasSystemInputContext<TCanvasInputContext>, event: Parameters<NonNullable<ZoomSystem["input"]["onWheel"]>>[1]) {
    if (!event.evt.ctrlKey) return false;
    const pointer = context.getPointerPosition();
    if (!pointer) return false;
    event.evt.preventDefault();
    const currentScale = context.data.camera.state.scale;
    const direction = event.evt.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
    const nextScale = clampScale(currentScale * direction);
    if (nextScale === currentScale) return true;
    context.data.camera.zoomAtScreenPoint({ scale: nextScale, screenPoint: pointer });
    context.requestDraw();
    return true;
  }
}

export { ZoomSystem };
