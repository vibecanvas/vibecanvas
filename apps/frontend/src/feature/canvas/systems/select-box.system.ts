import Konva from "konva";
import type { TCanvasInputContext } from "../types/canvas-context.types";
import { AbstractCanvasSystem } from "./system.abstract";
import type { TCanvasSystemInputContext } from "./system.abstract";

type TSelectBoxState = {
  origin: { x: number; y: number } | null;
};

class SelectBoxSystem extends AbstractCanvasSystem<TCanvasInputContext, TSelectBoxState> {
  readonly name = "select-box";

  readonly input: AbstractCanvasSystem<TCanvasInputContext, TSelectBoxState>["input"];

  readonly drawing: AbstractCanvasSystem<TCanvasInputContext, TSelectBoxState>["drawing"];

  constructor() {
    super({ priority: 20, state: { origin: null } });

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

  private hideSelectionRect(context: TCanvasSystemInputContext<TCanvasInputContext>) {
    context.data.selectionRect.visible(false);
    context.data.overlayLayer.batchDraw();
  }

  private canStart(context: TCanvasSystemInputContext<TCanvasInputContext>, event: Parameters<NonNullable<SelectBoxSystem["input"]["canStart"]>>[1]) {
    return context.data.getActiveTool() === "select" && event.target === context.stage;
  }

  private onStart(context: TCanvasSystemInputContext<TCanvasInputContext>) {
    const pointer = context.getPointerPosition();
    if (!pointer) return;
    this.state.origin = context.data.camera.screenToWorld(pointer);
    context.data.selectionRect.setAttrs({ x: this.state.origin.x, y: this.state.origin.y, width: 0, height: 0, visible: true });
    context.data.setSelectedIds([]);
    context.data.overlayLayer.batchDraw();
  }

  private onMove(context: TCanvasSystemInputContext<TCanvasInputContext>) {
    if (!this.state.origin) return;
    const pointer = context.getPointerPosition();
    if (!pointer) return;
    const worldPointer = context.data.camera.screenToWorld(pointer);
    context.data.selectionRect.setAttrs({
      x: Math.min(this.state.origin.x, worldPointer.x),
      y: Math.min(this.state.origin.y, worldPointer.y),
      width: Math.abs(worldPointer.x - this.state.origin.x),
      height: Math.abs(worldPointer.y - this.state.origin.y),
    });
    const selectionBounds = context.data.selectionRect.getClientRect();
    const selectedIds = context.data
      .getSelectableNodes()
      .filter((node) => node.id())
      .filter((node) => Konva.Util.haveIntersection(selectionBounds, node.getClientRect()))
      .map((node) => node.id());
    context.data.setSelectedIds(selectedIds);
    context.data.overlayLayer.batchDraw();
  }

  private onEnd(context: TCanvasSystemInputContext<TCanvasInputContext>) {
    this.state.origin = null;
    this.hideSelectionRect(context);
  }

  private onCancel(context: TCanvasSystemInputContext<TCanvasInputContext>) {
    this.state.origin = null;
    this.hideSelectionRect(context);
  }

  private getCursor(context: TCanvasSystemInputContext<TCanvasInputContext>) {
    if (context.activeSystemName === "select-box") return "crosshair";
    if (context.data.getActiveTool() === "select") return "default";
    return null;
  }
}

export { SelectBoxSystem };
