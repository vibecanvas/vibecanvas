import Konva from "konva";
import { CanvasMode } from "../services/canvas/enum";
import type { IPlugin, IPluginContext } from "./interface";
import { createEffect } from "solid-js";
import { produce } from "solid-js/store";


export class ExampleScenePlugin implements IPlugin {

  constructor() {
  }

  apply(context: IPluginContext): void {
    const rect1 = new Konva.Rect({
      x: 60,
      y: 60,
      width: 100,
      height: 90,
      fill: 'red',
      name: 'rect',
      draggable: true,
    });

    const rect2 = new Konva.Rect({
      x: 220,
      y: 140,
      width: 100,
      height: 90,
      fill: "blue",
      name: "rect",
      draggable: true,
    });

    rect2.on('pointerdown', e => {
      e.cancelBubble = true
      context.setState('selection', produce(selection => {
        if (!selection.includes(rect2)) {
          selection.push(rect2)
        }
      }))
    })

    context.staticForegroundLayer.add(rect1);
    context.staticForegroundLayer.add(rect2);


  }


}
