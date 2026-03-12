import type { TInputSystem } from "../managers/input.manager";
import type { TCanvasInputContext } from "../service/input-systems.types";
import type { TStrokePoint } from "../utils/stroke-renderer";
import { logCanvasDebug } from "../utils/canvas-debug";

/**
 * Local-only freehand pen tool.
 *
 * This system collects pointer samples in world space, updates a transient preview
 * path while dragging, and commits the finished stroke back to the canvas runtime
 * on pointer end.
 */
function createPenSystem(): TInputSystem<TCanvasInputContext> {
  let points: TStrokePoint[] = [];

  const getPressure = (event: MouseEvent | TouchEvent | PointerEvent) => {
    if (event instanceof PointerEvent && Number.isFinite(event.pressure) && event.pressure > 0) {
      return event.pressure;
    }

    return 0.5;
  };

  const createPoint = (context: { getPointerPosition: () => { x: number; y: number } | null; data: TCanvasInputContext }, event?: MouseEvent | TouchEvent | PointerEvent) => {
    const pointer = context.getPointerPosition();
    if (!pointer) return null;

    const worldPoint = context.data.camera.screenToWorld(pointer);

    return {
      x: worldPoint.x,
      y: worldPoint.y,
      pressure: event ? getPressure(event) : 0.5,
    } satisfies TStrokePoint;
  };

  return {
    name: "pen",
    priority: 15,
    canStart: (context) => {
      const canStart = context.data.getActiveTool() === "pen";

      if (canStart) {
        logCanvasDebug("[pen-system] canStart matched for pen tool");
      }

      return canStart;
    },
    onStart: (context, event) => {
      const point = createPoint(context, event.evt);
      if (!point) return;

      points = [point, { ...point, x: point.x + 0.01, y: point.y + 0.01 }];
      logCanvasDebug("[pen-system] onStart", {
        point,
        pointsLength: points.length,
      });
      context.data.beginStrokePreview(point);
      context.data.updateStrokePreview(points);
    },
    onMove: (context, event) => {
      if (points.length === 0) return;

      const point = createPoint(context, event.evt);
      if (!point) return;

      const previousPoint = points[points.length - 1];
      if (previousPoint && previousPoint.x === point.x && previousPoint.y === point.y) {
        return;
      }

      points = [...points, point];
      logCanvasDebug("[pen-system] onMove", {
        point,
        pointsLength: points.length,
      });
      context.data.updateStrokePreview(points);
    },
    onEnd: (context) => {
      logCanvasDebug("[pen-system] onEnd", {
        pointsLength: points.length,
      });

      if (points.length >= 2) {
        context.data.commitStroke(points);
      } else {
        context.data.cancelStrokePreview();
      }

      points = [];
    },
    onCancel: (context) => {
      logCanvasDebug("[pen-system] onCancel", {
        pointsLength: points.length,
      });
      points = [];
      context.data.cancelStrokePreview();
    },
    getCursor: (context) => {
      if (context.data.getActiveTool() === "pen") return "crosshair";
      return null;
    },
  };
}

export { createPenSystem };
