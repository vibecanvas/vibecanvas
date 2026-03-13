import Konva from "konva";
import { CanvasMode } from "../services/canvas/enum";
import type { IPlugin, IPluginContext } from "./interface";


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
    context.staticForegroundLayer.add(this.#selectionRectangle);

    context.hooks.customEvent.tap(() => {
      if (context.state.mode === CanvasMode.SELECT) return false;
      this.#selectionRectangle.visible(false);

      return false; // allow other plugins to handle the event too
    })

    context.hooks.pointerDown.tap(e => {
      if (context.state.mode !== CanvasMode.SELECT) return;
      this.#selectionRectangle.visible(true);
      this.#selectionRectangle.x(e.evt.offsetX);
      this.#selectionRectangle.y(e.evt.offsetY);
      this.#selectionRectangle.width(0);
      this.#selectionRectangle.height(0);
    })

    context.hooks.pointerMove.tap(e => {
      if (context.state.mode !== CanvasMode.SELECT) return;
      this.#selectionRectangle.width(e.evt.offsetX - this.#selectionRectangle.x());
      this.#selectionRectangle.height(e.evt.offsetY - this.#selectionRectangle.y());
    })

    context.hooks.pointerUp.tap(e => {
      if (context.state.mode !== CanvasMode.SELECT) return;
      this.#selectionRectangle.visible(false);
    })
  }


}
