import Konva from "konva";
import { CanvasMode } from "../services/canvas/enum";
import type { IPlugin, IPluginContext } from "./interface";

function getSelectionLayerPointerPosition(context: IPluginContext) {
  const pointer = context.dynamicLayer.getRelativePointerPosition();
  if (!pointer) return null;

  return pointer;
}

function hasSameSelectionOrder(
  currentSelection: Array<{ id(): string }>,
  nextSelection: Array<{ id(): string }>,
) {
  if (currentSelection.length != nextSelection.length) return false;

  return currentSelection.every((node, index) => node.id() === nextSelection[index]?.id());
}

export class SelectPlugin implements IPlugin {
  #selectionRectangle: Konva.Rect;

  constructor() {
    this.#selectionRectangle = new Konva.Rect({
      visible: false,
      fill: "rgba(59, 130, 246, 0.12)",
      stroke: "#3b82f6",
      strokeWidth: 1,
      dash: [6, 4],
      listening: false,
    });
  }

  apply(context: IPluginContext): void {
    context.dynamicLayer.add(this.#selectionRectangle);

    context.hooks.customEvent.tap(() => {
      if (context.state.mode === CanvasMode.SELECT) return false;
      this.#selectionRectangle.visible(false);
      context.dynamicLayer.batchDraw();

      return false;
    });

    context.hooks.pointerDown.tap(() => {
      if (context.state.mode !== CanvasMode.SELECT) return;
      const pointer = getSelectionLayerPointerPosition(context);
      if (!pointer) return;

      this.#selectionRectangle.visible(true);
      this.#selectionRectangle.position(pointer);
      this.#selectionRectangle.size({ width: 0, height: 0 });
      this.#selectionRectangle.moveToTop();


      context.setState('selection', []);


      context.dynamicLayer.batchDraw();
    });

    context.hooks.pointerMove.tap(() => {
      if (context.state.mode !== CanvasMode.SELECT || !this.#selectionRectangle.visible()) return;
      const pointer = getSelectionLayerPointerPosition(context);
      if (!pointer) return;

      this.#selectionRectangle.size({
        width: pointer.x - this.#selectionRectangle.x(),
        height: pointer.y - this.#selectionRectangle.y(),
      });

      const topNodes = context.staticForegroundLayer.getChildren(item => item.parent?.id === context.staticForegroundLayer.id)
      const inSelection = topNodes.filter(node => {
        return Konva.Util.haveIntersection(node.getClientRect(), this.#selectionRectangle.getClientRect());
      }).sort((a, b) => a.id().localeCompare(b.id()))

      if (!hasSameSelectionOrder(context.state.selection, inSelection)) {
        context.setState('selection', inSelection);
      }

      context.dynamicLayer.batchDraw();
    });

    context.hooks.pointerUp.tap(() => {
      if (context.state.mode !== CanvasMode.SELECT) return;
      this.#selectionRectangle.visible(false);
      context.dynamicLayer.batchDraw();
    });
  }
}
