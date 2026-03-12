import type { TCanvasInputContext } from "../types/canvas-context.types";
import { AbstractCanvasSystem } from "./system.abstract";
import type { TCanvasSystemInputContext, TCanvasSystemRuntimeContext } from "./system.abstract";

type TPanState = {
  startPointer: { x: number; y: number } | null;
  startCameraPosition: { x: number; y: number } | null;
};

/**
 * Handles viewport translation.
 *
 * This system supports two panning styles:
 * - drag panning via middle mouse, `Space`, or the `hand` tool
 * - touchpad/two-finger panning via wheel events without modifiers
 *
 * Wheel handling intentionally returns a boolean so the input manager can let the
 * zoom system try first on `ctrl+wheel`, while normal wheel gestures fall through
 * here and move the camera.
 */
class PanSystem extends AbstractCanvasSystem<TCanvasInputContext, TPanState> {
  readonly name = "pan";

  readonly input: AbstractCanvasSystem<TCanvasInputContext, TPanState>["input"];

  readonly drawing: AbstractCanvasSystem<TCanvasInputContext, TPanState>["drawing"];

  constructor() {
    super({
      priority: 10,
      state: {
        startPointer: null,
        startCameraPosition: null,
      },
    });

    this.input = {
      canStart: this.canStart.bind(this),
      onStart: this.onStart.bind(this),
      onMove: this.onMove.bind(this),
      onEnd: this.onEnd.bind(this),
      onCancel: this.onCancel.bind(this),
      onWheel: this.onWheel.bind(this),
      getCursor: this.getCursor.bind(this),
    };

    this.drawing = {};
  }

  private canStart(context: TCanvasSystemInputContext<TCanvasInputContext>, event: Parameters<NonNullable<PanSystem["input"]["canStart"]>>[1]) {
    const isMiddleMouse = event.evt instanceof MouseEvent && event.evt.button === 1;
    return isMiddleMouse || context.data.getActiveTool() === "hand";
  }

  private onStart(context: TCanvasSystemInputContext<TCanvasInputContext>) {
    const pointer = context.getPointerPosition();
    if (!pointer) return;

    this.state.startPointer = pointer;
    this.state.startCameraPosition = context.data.camera.state;
  }

  private onMove(context: TCanvasSystemInputContext<TCanvasInputContext>) {
    if (!this.state.startPointer || !this.state.startCameraPosition) return;

    const pointer = context.getPointerPosition();
    if (!pointer) return;

    context.data.camera.setPosition({
      x: this.state.startCameraPosition.x + (pointer.x - this.state.startPointer.x),
      y: this.state.startCameraPosition.y + (pointer.y - this.state.startPointer.y),
    });
    context.requestDraw();
  }

  private onWheel(context: TCanvasSystemInputContext<TCanvasInputContext>, event: Parameters<NonNullable<PanSystem["input"]["onWheel"]>>[1]) {
    if (event.evt.ctrlKey) return false;
    event.evt.preventDefault();
    context.data.camera.panBy({ x: -event.evt.deltaX, y: -event.evt.deltaY });
    context.requestDraw();
    return true;
  }

  private onEnd() {
    this.state.startPointer = null;
    this.state.startCameraPosition = null;
  }

  private onCancel() {
    this.state.startPointer = null;
    this.state.startCameraPosition = null;
  }

  private getCursor(context: TCanvasSystemInputContext<TCanvasInputContext>) {
    if (context.activeSystemName === "pan") return "grabbing";
    if (context.data.getActiveTool() === "hand") return "grab";
    return null;
  }
}

export { PanSystem };
