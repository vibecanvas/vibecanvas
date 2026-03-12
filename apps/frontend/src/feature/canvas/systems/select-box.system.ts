import Konva from "konva";
import type { TCanvasInputContext } from "../types/canvas-context.types";
import { AbstractCanvasSystem } from "./system.abstract";
import type { TCanvasSystemInputContext, TCanvasSystemRuntimeContext } from "./system.abstract";

type TSelectBoxState = {
  origin: { x: number; y: number } | null;
  selectionRect: Konva.Rect | null;
};

class SelectBoxSystem extends AbstractCanvasSystem<TCanvasInputContext, TSelectBoxState> {
  readonly name = "select-box";

  readonly input: AbstractCanvasSystem<TCanvasInputContext, TSelectBoxState>["input"];

  constructor() {
    super({ priority: 20, state: { origin: null, selectionRect: null } });

    this.input = {
      canStart: this.canStart.bind(this),
      onStart: this.onStart.bind(this),
      onMove: this.onMove.bind(this),
      onEnd: this.onEnd.bind(this),
      onCancel: this.onCancel.bind(this),
      getCursor: this.getCursor.bind(this),
    };
  }

  mount(context: TCanvasSystemRuntimeContext<TCanvasInputContext>) {
    const selectionRect = new Konva.Rect({
      visible: false,
      fill: "rgba(59, 130, 246, 0.12)",
      stroke: "#3b82f6",
      strokeWidth: 1,
      dash: [6, 4],
      listening: false,
    });

    this.state.selectionRect = selectionRect;
    context.data.mountPreviewNode(this.name, selectionRect);
  }

  unmount(context: TCanvasSystemRuntimeContext<TCanvasInputContext>) {
    this.state.origin = null;
    this.state.selectionRect = null;
    context.data.unmountPreviewNode(this.name);
  }

  private hideSelectionRect() {
    if (!this.state.selectionRect) return;
    this.state.selectionRect.visible(false);
    this.state.selectionRect.getLayer()?.batchDraw();
  }

  private canStart(context: TCanvasSystemInputContext<TCanvasInputContext>, event: Parameters<NonNullable<SelectBoxSystem["input"]["canStart"]>>[1]) {
    return context.data.getActiveTool() === "select" && event.target === context.stage;
  }

  private onStart(context: TCanvasSystemInputContext<TCanvasInputContext>) {
    const pointer = context.getPointerPosition();
    if (!pointer || !this.state.selectionRect) return;
    this.state.origin = context.data.camera.screenToWorld(pointer);
    this.state.selectionRect.setAttrs({ x: this.state.origin.x, y: this.state.origin.y, width: 0, height: 0, visible: true });
    context.data.selection.clear();
    this.state.selectionRect.getLayer()?.batchDraw();
  }

  private onMove(context: TCanvasSystemInputContext<TCanvasInputContext>) {
    if (!this.state.origin || !this.state.selectionRect) return;
    const pointer = context.getPointerPosition();
    if (!pointer) return;
    const worldPointer = context.data.camera.screenToWorld(pointer);
    this.state.selectionRect.setAttrs({
      x: Math.min(this.state.origin.x, worldPointer.x),
      y: Math.min(this.state.origin.y, worldPointer.y),
      width: Math.abs(worldPointer.x - this.state.origin.x),
      height: Math.abs(worldPointer.y - this.state.origin.y),
    });
    const selectionBounds = this.state.selectionRect.getClientRect();
    const selectedIds = context.data
      .getSelectableNodes()
      .filter((node) => node.id())
      .filter((node) => Konva.Util.haveIntersection(selectionBounds, node.getClientRect()))
      .map((node) => node.id());
    context.data.selection.setSelectedIds(selectedIds);
    this.state.selectionRect.getLayer()?.batchDraw();
  }

  private onEnd(context: TCanvasSystemInputContext<TCanvasInputContext>) {
    if (this.state.selectionRect && this.state.selectionRect.visible() && this.state.selectionRect.width() > 0 && this.state.selectionRect.height() > 0) {
      context.data.suppressNextClickSelection();
    }
    this.state.origin = null;
    this.hideSelectionRect();
  }

  private onCancel() {
    this.state.origin = null;
    this.hideSelectionRect();
  }

  private getCursor(context: TCanvasSystemInputContext<TCanvasInputContext>) {
    if (context.activeSystemName === "select-box") return "crosshair";
    if (context.data.getActiveTool() === "select") return "default";
    return null;
  }
}

export { SelectBoxSystem };
