import Konva from "konva";
import type { TPenData } from "@vibecanvas/shell/automerge/index";
import type { TCanvasElementDraft } from "../types/canvas-context.types";
import type { TCanvasInputContext } from "../types/canvas-context.types";
import { createPenDataFromStrokePoints, getStrokePath, scalePenDataPoints, type TStrokePoint } from "../utils/stroke.math";
import { logCanvasDebug } from "../utils/canvas-debug";
import { AbstractCanvasSystem } from "./system.abstract";
import type { TCanvasSystemInputContext, TCanvasSystemRuntimeContext } from "./system.abstract";

type TPenState = {
  points: TStrokePoint[];
  previewPath: Konva.Path | null;
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

  constructor() {
    super({ priority: 15, state: { points: [], previewPath: null } });

    this.input = {
      canStart: this.canStart.bind(this),
      onStart: this.onStart.bind(this),
      onMove: this.onMove.bind(this),
      onEnd: this.onEnd.bind(this),
      onCancel: this.onCancel.bind(this),
      getCursor: PenSystem.getCursor,
    };
  }

  static createTransformUpdate(node: Konva.Node): { id: string; update: Partial<Omit<TCanvasElementDraft, "id">> } | null {
    const elementId = node.getAttr("vcElementId");
    const elementData = node.getAttr("vcElementData") as TPenData | undefined;
    if (typeof elementId !== "string" || !elementData || elementData.type !== "pen") return null;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    return {
      id: elementId,
      update: {
        x: node.x(),
        y: node.y(),
        angle: node.rotation(),
        data: {
          ...elementData,
          points: scalePenDataPoints(elementData.points, scaleX, scaleY),
        },
      },
    };
  }

  mount(context: TCanvasSystemRuntimeContext<TCanvasInputContext>) {
    const previewPath = new Konva.Path({
      data: "",
      fill: "#0f172a",
      opacity: 0.92,
      visible: false,
      listening: false,
    });

    this.state.previewPath = previewPath;
    context.data.mountPreviewNode(this.name, previewPath);
  }

  unmount(context: TCanvasSystemRuntimeContext<TCanvasInputContext>) {
    this.state.previewPath = null;
    this.state.points = [];
    context.data.unmountPreviewNode(this.name);
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

  private syncPreview() {
    if (!this.state.previewPath) return;

    const data = getStrokePath(this.state.points);
    this.state.previewPath.setAttrs({
      data,
      visible: Boolean(data),
    });
    this.state.previewPath.getLayer()?.batchDraw();
  }

  private clearPreview() {
    if (!this.state.previewPath) return;
    this.state.previewPath.hide();
    this.state.previewPath.data("");
    this.state.previewPath.getLayer()?.batchDraw();
  }

  private createPenElementData(): (TPenData & { x: number; y: number }) | null {
    return createPenDataFromStrokePoints(this.state.points);
  }

  private onStart(context: TCanvasSystemInputContext<TCanvasInputContext>, event: Parameters<NonNullable<PenSystem["input"]["onStart"]>>[1]) {
    const point = this.createPoint(context, event.evt);
    if (!point) return;
    this.state.points = [point, { ...point, x: point.x + 0.01, y: point.y + 0.01 }];
    logCanvasDebug("[pen-system] onStart", { point, pointsLength: this.state.points.length });
    this.syncPreview();
  }

  private onMove(context: TCanvasSystemInputContext<TCanvasInputContext>, event: Parameters<NonNullable<PenSystem["input"]["onMove"]>>[1]) {
    if (this.state.points.length === 0) return;
    const point = this.createPoint(context, event.evt);
    if (!point) return;
    const previousPoint = this.state.points[this.state.points.length - 1];
    if (previousPoint && previousPoint.x === point.x && previousPoint.y === point.y) return;
    this.state.points = [...this.state.points, point];
    logCanvasDebug("[pen-system] onMove", { point, pointsLength: this.state.points.length });
    this.syncPreview();
  }

  private onEnd(context: TCanvasSystemInputContext<TCanvasInputContext>) {
    logCanvasDebug("[pen-system] onEnd", { pointsLength: this.state.points.length });
    if (this.state.points.length >= 2) {
      const penData = this.createPenElementData();
      if (penData) {
        context.data.createElement({
          x: penData.x,
          y: penData.y,
          data: {
            type: "pen",
            points: penData.points,
            pressures: penData.pressures,
            simulatePressure: penData.simulatePressure,
          },
          style: {
            backgroundColor: "#0f172a",
            opacity: 0.92,
          },
        });
      }
    } else {
      this.clearPreview();
    }
    this.clearPreview();
    this.state.points = [];
  }

  private onCancel() {
    logCanvasDebug("[pen-system] onCancel", { pointsLength: this.state.points.length });
    this.state.points = [];
    this.clearPreview();
  }

  private static getCursor(context: TCanvasSystemInputContext<TCanvasInputContext>) {
    if (context.data.getActiveTool() === "pen") return "crosshair";
    return null;
  }
}

export { PenSystem };
