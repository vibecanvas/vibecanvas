import Konva from "konva";
import { CanvasMode } from "../services/canvas/enum";
import type { IPlugin, IPluginContext } from "./interface";
import { createEffect } from "solid-js";


export class TransformPlugin implements IPlugin {
  #transformer: Konva.Transformer;

  constructor() {
    this.#transformer = new Konva.Transformer({
    });

    this.#transformer.on('click pointerdown', e => {
      e.cancelBubble = true
    })

  }

  apply(context: IPluginContext): void {
    context.dynamicLayer.add(this.#transformer);
    createEffect(() => {
      this.#transformer.setNodes(context.state.selection)
      this.#transformer.update()
    })



  }


}
