import Konva from "konva";
import { CanvasMode } from "../services/canvas/enum";
import type { IPlugin, IPluginContext } from "./interface";
import { createEffect } from "solid-js";
import { produce } from "solid-js/store";


export class Shape2dPlugin implements IPlugin {

  constructor() {

  }

  apply(context: IPluginContext): void {

  }

  static createRect(context: IPluginContext, args: { x: number, y: number, w: number, h: number, fill: string }) {
    const shape = new Konva.Rect({
      x: args.x,
      y: args.y,
      width: args.w,
      height: args.h,
      fill: args.fill,
      name: 'rect',
      draggable: true,
    });

    shape.on('click dragstart', e => {
      console.log('click', e.type)
      e.cancelBubble = true
      context.setState('selection', produce(selection => {
        if (!e.evt.shiftKey) selection.length = 0
        if (!selection.includes(shape)) {
          selection.push(shape)
        }
      }))
    })

    shape.on('dragmove', e => {
      console.log('dragmove', e.type)
      e.cancelBubble = true
    })

    shape.on('transform', e => {
      console.log('transform', e.type)
      e.cancelBubble = true
    })

    context.staticForegroundLayer.add(shape);
    context.staticForegroundLayer.batchDraw();
  }


}
