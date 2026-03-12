import type { TCanvasInputContext } from "../types/canvas-context.types";
import type { TStrokePoint } from "../utils/stroke-renderer";
import { logCanvasDebug } from "../utils/canvas-debug";
import { AbstractCanvasSystem } from "./system.abstract";
import type { TCanvasSystemInputContext } from "./system.abstract";

type TPenState = {
  points: TStrokePoint[];
};

/**
 * Local-only freehand pen tool.
 *
 * This system collects pointer samples in world space, updates a transient preview
 * path while dragging, and commits the finished stroke back to the canvas runtime
 * on pointer end.
 */
class PenSystem extends AbstractCanvasSystem<TCanvasInputContext, TPenState> {
  readonly name = "pen";

  readonly input: AbstractCanvasSystem<TCanvasInputContext, TPenState>["input"];

  readonly drawing: AbstractCanvasSystem<TCanvasInputContext, TPenState>["drawing"];

  constructor() {
    super({ priority: 15, state: { points: [] } });

    this.input = {
      canStart: this.canStart.bind(this),
      onStart: this.onStart.bind(this),
      onMove: this.onMove.bind(this),
      onEnd: this.onEnd.bind(this),
      onCancel: this.onCancel.bind(this),
      getCursor: this.getCursor.bind(this),
    };

    this.drawing = {};
  }

  private getPressure(event: MouseEvent | TouchEvent | PointerEvent) {
    if (event instanceof PointerEvent && Number.isFinite(event.pressure) && event.pressure > 0) {
      return event.pressure;
    }

    return 0.5;
  }

  private createPoint(context: TCanvasSystemInputContext<TCanvasInputContext>, event?: MouseEvent | TouchEvent | PointerEvent) {
    const pointer = context.getPointerPosition();
    if (!pointer) return null;

    const worldPoint = context.data.camera.screenToWorld(pointer);

    return {
      x: worldPoint.x,
      y: worldPoint.y,
      pressure: event ? this.getPressure(event) : 0.5,
    } satisfies TStrokePoint;
  }

  private canStart(context: TCanvasSystemInputContext<TCanvasInputContext>) {
    const canStart = context.data.getActiveTool() === "pen";
    if (canStart) logCanvasDebug("[pen-system] canStart matched for pen tool");
    return canStart;
  }

  private onStart(context: TCanvasSystemInputContext<TCanvasInputContext>, event: Parameters<NonNullable<PenSystem["input"]["onStart"]>>[1]) {
    const point = this.createPoint(context, event.evt);
    if (!point) return;
    this.state.points = [point, { ...point, x: point.x + 0.01, y: point.y + 0.01 }];
    logCanvasDebug("[pen-system] onStart", { point, pointsLength: this.state.points.length });
    context.data.beginStrokePreview(point);
    context.data.updateStrokePreview(this.state.points);
  }

  private onMove(context: TCanvasSystemInputContext<TCanvasInputContext>, event: Parameters<NonNullable<PenSystem["input"]["onMove"]>>[1]) {
    if (this.state.points.length === 0) return;
    const point = this.createPoint(context, event.evt);
    if (!point) return;
    const previousPoint = this.state.points[this.state.points.length - 1];
    if (previousPoint && previousPoint.x === point.x && previousPoint.y === point.y) return;
    this.state.points = [...this.state.points, point];
    logCanvasDebug("[pen-system] onMove", { point, pointsLength: this.state.points.length });
    context.data.updateStrokePreview(this.state.points);
  }

  private onEnd(context: TCanvasSystemInputContext<TCanvasInputContext>) {
    logCanvasDebug("[pen-system] onEnd", { pointsLength: this.state.points.length });
    if (this.state.points.length >= 2) {
      context.data.commitStroke(this.state.points);
    } else {
      context.data.cancelStrokePreview();
    }
    this.state.points = [];
  }

  private onCancel(context: TCanvasSystemInputContext<TCanvasInputContext>) {
    logCanvasDebug("[pen-system] onCancel", { pointsLength: this.state.points.length });
    this.state.points = [];
    context.data.cancelStrokePreview();
  }

  private getCursor(context: TCanvasSystemInputContext<TCanvasInputContext>) {
    if (context.data.getActiveTool() === "pen") return "crosshair";
    return null;
  }
}

export { PenSystem };
