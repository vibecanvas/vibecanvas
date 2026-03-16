import Konva from "konva";
import { CanvasMode } from "../services/canvas/enum";
import type { IPlugin, IPluginContext } from "./interface";
import { createEffect } from "solid-js";


export class TransformPlugin implements IPlugin {
  #transformer: Konva.Transformer;

  constructor() {
    this.#transformer = new Konva.Transformer({
    });

    this.#transformer.on('pointerclick pointerdown', e => {
      e.cancelBubble = true
    })

  }

  apply(context: IPluginContext): void {
    context.dynamicLayer.add(this.#transformer);
    createEffect(() => {
      if (context.state.selection.length === 1 && context.state.selection[0] instanceof Konva.Group) {
        this.#transformer.borderEnabled(false)
      } else if (context.state.selection.length > 1) {
        this.#transformer.borderEnabled(true)
        this.#transformer.borderDash([2, 2])
      } else if (context.state.selection.length === 1) {
        this.#transformer.borderEnabled(true)
        this.#transformer.borderDash([0, 0])
      }
      this.#transformer.setNodes(context.state.selection)
      this.#transformer.update()
    })



  }


}
