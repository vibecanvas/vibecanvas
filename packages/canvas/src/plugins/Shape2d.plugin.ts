import Konva from "konva";
import { CanvasMode } from "../services/canvas/enum";
import type { IPlugin, IPluginContext } from "./interface";
import { createEffect } from "solid-js";
import { produce } from "solid-js/store";
import type { TTool } from "../components/FloatingCanvasToolbar/toolbar.types";
import { CustomEvents } from "../custom-events";


export class Shape2dPlugin implements IPlugin {
  #previewDrawing: Konva.Shape | null = null;
  #activeTool: TTool = 'select';

  constructor() {

  }

  apply(context: IPluginContext): void {
    this.setupPreview(context);

  }

  private setupPreview(context: IPluginContext) {
    context.hooks.customEvent.tap((event, payload) => {
      if (event === CustomEvents.TOOL_SELECT) {
        this.#activeTool = payload;
      }
      return false;
    })

    context.hooks.pointerDown.tap((e) => {
      if (context.state.mode !== CanvasMode.DRAW_CREATE) return;
      const pointer = context.dynamicLayer.getRelativePointerPosition();
      if (!pointer) return;

      this.#previewDrawing = Shape2dPlugin.createPreviewRect({
        x: pointer.x,
        y: pointer.y,
        w: 0,
        h: 0,
        fill: 'red',
      });
      context.dynamicLayer.add(this.#previewDrawing);
    })

    context.hooks.pointerMove.tap((e) => {
      if (context.state.mode !== CanvasMode.DRAW_CREATE) return;
      const pointer = context.dynamicLayer.getRelativePointerPosition();
      if (!pointer) return;

      this.#previewDrawing?.setAttrs({
        width: pointer.x - this.#previewDrawing.x(),
        height: pointer.y - this.#previewDrawing.y(),
      });
    })

    context.hooks.pointerUp.tap(() => {
      if (context.state.mode !== CanvasMode.DRAW_CREATE) return;
      const shape = this.#previewDrawing?.clone()
      this.#previewDrawing?.destroy()
      this.#previewDrawing = null;
      context.setState('mode', CanvasMode.SELECT)
      context.hooks.customEvent.call(CustomEvents.TOOL_SELECT, 'select')

      Shape2dPlugin.syncShape(shape, context)
    })
  }

  static syncShape(shape: Konva.Shape, context: IPluginContext) {
    shape.setDraggable(true)
    shape.on('click dragstart', e => {
      if (context.state.mode !== CanvasMode.SELECT) {
        shape.stopDrag()
        return
      }

      console.log(e)
      if (e.type === 'click')
        context.setState('selection', produce(selection => {
          if (!e.evt.shiftKey) selection.length = 0
          if (!selection.includes(shape)) {
            selection.push(shape)
          }
        }))
    })

    shape.on('dragmove', e => {
      console.log('dragmove', e.type)
    })

    shape.on('transform', e => {
      console.log('transform', e.type)
    })

    context.staticForegroundLayer.add(shape);
  }

  static createPreviewRect(args: { x: number, y: number, w: number, h: number, fill: string }) {
    const shape = new Konva.Rect({
      x: args.x,
      y: args.y,
      width: args.w,
      height: args.h,
      fill: args.fill,
      name: 'rect',
      draggable: false,
    });

    return shape

  }

}
