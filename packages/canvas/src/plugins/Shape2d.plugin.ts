import Konva from "konva";
import { CanvasMode } from "../services/canvas/enum";
import type { IPlugin, IPluginContext } from "./interface";
import { createEffect } from "solid-js";
import { produce } from "solid-js/store";
import type { TTool } from "../components/FloatingCanvasToolbar/toolbar.types";
import { CustomEvents } from "../custom-events";
import { TCanvasDoc, TElement, TElementData, TElementStyle, TRectData } from "@vibecanvas/shell/automerge/index";


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

      if (this.#activeTool === 'rectangle') {
        this.#previewDrawing = Shape2dPlugin.createPreviewRect({
          id: crypto.randomUUID(),
          angle: 0,
          x: pointer.x,
          y: pointer.y,
          bindings: [],
          createdAt: Date.now(),
          locked: false,
          parentGroupId: null,
          updatedAt: Date.now(),
          zIndex: '',
          data: {
            type: 'rect',
            w: 0,
            h: 0,
          },
          style: {
            backgroundColor: 'red'
          }
        });
      }
      if (this.#previewDrawing) context.dynamicLayer.add(this.#previewDrawing);
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

      if (e.type === 'click')
        context.setState('selection', produce(selection => {
          if (!e.evt.shiftKey) selection.length = 0
          if (!selection.includes(shape)) {
            selection.push(shape)
          }
        }))

      if (e.type === 'dragstart' && e.evt.altKey) {
        shape.stopDrag()
        console.log('drag clone')
        Shape2dPlugin.createCloneDrag(shape, context)
      }
    })

    shape.on('dragmove', e => {
      const backendData: TElement = shape.getAttr('backendData');
      const { x, y } = shape.position();
      backendData.x = x
      backendData.y = y
      shape.setAttr('backendData', backendData)
    })

    shape.on('transform', e => {
      const backendData: TElement = shape.getAttr('backendData');
      const rotation = shape.rotation()
      const { x, y } = shape.position();
      const { height, width } = shape.size()
      backendData.angle = rotation
      backendData.x = x
      backendData.y = y
      if (backendData.data.type === 'rect' || backendData.data.type === 'diamond') {
        backendData.data.h = height
        backendData.data.w = width
      }
      shape.setAttr('backendData', backendData)
    })

    context.staticForegroundLayer.add(shape);
  }

  static createCloneDrag(shape: Konva.Shape, context: IPluginContext) {
    const backendData = shape.getAttr('backendData') as TElement
    let newShape: Konva.Shape | null = null;
    if (backendData.data.type === 'rect') {
      const newBackendData = structuredClone(backendData)
      newBackendData.id = crypto.randomUUID()
      newShape = Shape2dPlugin.createPreviewRect(newBackendData)
    }

    if (newShape) {
      context.dynamicLayer.add(newShape)
      newShape.startDrag()
      newShape.on('dragmove', e => {
        const { x, y } = newShape.getPosition()
        // NOTE: better to selectivly set data, idk how
        newShape.setAttr('backendData', { ...newShape.getAttr('backendData'), x, y })
      })
      newShape.on('dragend', () => {
        newShape.off('dragend')
        newShape.off('dragmove')
        Shape2dPlugin.syncShape(newShape, context)
      })
      newShape.moveToTop()
    }
    return newShape;

  }

  static createPreviewRect(backendData: TElement) {
    const data = backendData.data as TRectData
    const shape = new Konva.Rect({
      id: backendData.id,
      rotationDeg: backendData.angle,
      x: backendData.x,
      y: backendData.y,
      width: data.w,
      height: data.h,
      fill: backendData.style.backgroundColor,
      draggable: false,
      backendData: backendData
    });

    return shape

  }

}
