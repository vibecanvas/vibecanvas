import { TElement, TElementData, TElementStyle, TRectData } from "@vibecanvas/shell/automerge/index";
import Konva from "konva";
import type { TTool } from "../components/FloatingCanvasToolbar/toolbar.types";
import { CustomEvents } from "../custom-events";
import { CanvasMode } from "../services/canvas/enum";
import type { IPlugin, IPluginContext } from "./interface";
import { throttle } from "@solid-primitives/scheduled";


export class Shape2dPlugin implements IPlugin {
  #previewDrawing: Konva.Shape | null = null;
  #activeTool: TTool = 'select';
  static supportedTypes: Set<TElementData['type']> = new Set(['rect', 'diamond', 'ellipse']);

  constructor() {

  }

  apply(context: IPluginContext): void {
    this.setupPreview(context);
    Shape2dPlugin.setupCapablities(context)

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
        this.#previewDrawing = Shape2dPlugin.createRectFromElement({
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
      const shape: Konva.Shape | undefined = this.#previewDrawing?.clone()
      this.#previewDrawing?.destroy()
      this.#previewDrawing = null;
      context.setState('mode', CanvasMode.SELECT)
      context.hooks.customEvent.call(CustomEvents.TOOL_SELECT, 'select')

      if (!shape) return;
      Shape2dPlugin.setupShapeListeners(context, shape)
      shape.setDraggable(true)
      context.staticForegroundLayer.add(shape);
      context.crdt.patch({ elements: [Shape2dPlugin.toTElement(shape)], groups: [] })
    })
  }

  private static setupCapablities(context: IPluginContext) {
    const currentCreateShapeFromTElement = context.capabilities.createShapeFromTElement
    context.capabilities.createShapeFromTElement = (element) => {
      if (!Shape2dPlugin.supportedTypes.has(element.data.type)) {
        return currentCreateShapeFromTElement?.(element) || null
      } else {
        const shape = Shape2dPlugin.createRectFromElement(element)
        if (shape) {
          Shape2dPlugin.setupShapeListeners(context, shape)
          shape.setDraggable(true)
        }
        return shape
      }
    }

    const currentToElement = context.capabilities.toElement
    context.capabilities.toElement = (node) => {
      if (node instanceof Konva.Rect) {
        return Shape2dPlugin.toTElement(node)
      }
      return currentToElement?.(node) || null
    }

    context.capabilities.updateShapeFromTElement = (element) => {
      if (!Shape2dPlugin.supportedTypes.has(element.data.type)) {
        return currentCreateShapeFromTElement?.(element) || null
      } else {
        const shape = context.staticForegroundLayer.findOne((node: Konva.Node) => node.id() === element.id) as Konva.Shape
        if (shape) {
          Shape2dPlugin.updateShapeFromTElement(context, shape, element)
          return shape
        }
        return null
      }
    }
  }

  private static updateShapeFromTElement(context: IPluginContext, shape: Konva.Shape, element: TElement) {
    // TODO: add for other shapes
    if (shape instanceof Konva.Rect && element.data.type === 'rect') {
      const absolutePosition = shape.absolutePosition()
      if (absolutePosition.x !== element.x || absolutePosition.y !== element.y) {
        shape.setAbsolutePosition({ x: element.x, y: element.y })
      }
      if (shape.rotation() !== element.angle) shape.rotation(element.angle)
      if (shape.width() !== element.data.w) shape.width(element.data.w)
      if (shape.height() !== element.data.h) shape.height(element.data.h)
      if (shape.scaleX() !== 1) shape.scaleX(1)
      if (shape.scaleY() !== 1) shape.scaleY(1)
      if (element.style.backgroundColor !== shape.fill()) shape.fill(element.style.backgroundColor)
      if (element.style.strokeColor !== shape.stroke()) shape.stroke(element.style.strokeColor)
      if (element.style.strokeWidth !== shape.strokeWidth()) shape.strokeWidth(element.style.strokeWidth)
      if (element.style.opacity !== shape.opacity()) shape.opacity(element.style.opacity)
    }

  }

  static toTElement(shape: Konva.Shape): TElement {
    let data!: TElementData
    if (shape instanceof Konva.Rect) {
      data = {
        type: 'rect',
        w: shape.width() * shape.scaleX(),
        h: shape.height() * shape.scaleY(),
      }
    } else
      throw new Error('Unsupported shape type')

    let style: TElementStyle = {
      opacity: shape.opacity(),
      strokeWidth: shape.strokeWidth(),
    }

    if (typeof shape.fill() === 'string') style.backgroundColor = shape.fill() as string
    if (typeof shape.stroke() === 'string') style.strokeColor = shape.stroke() as string
    const parent = shape.getParent()
    const parentGroupId = parent instanceof Konva.Group ? parent.id() : null
    const { x, y } = shape.absolutePosition()

    return {
      id: shape.id(),
      angle: shape.getAbsoluteRotation(),
      x,
      y,
      bindings: [],
      createdAt: Date.now(),
      locked: false,
      parentGroupId,
      updatedAt: Date.now(),
      zIndex: '',
      data,
      style,
    }
  }

  static setupShapeListeners(context: IPluginContext, shape: Konva.Shape) {
    shape.on('pointerclick', e => {
      console.log(shape.getType(), shape.fill(), shape.x(), shape.y())
      if (context.state.mode !== CanvasMode.SELECT) return
      context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERCLICK, e)
    })

    shape.on('pointerdown dragstart', e => {
      if (context.state.mode !== CanvasMode.SELECT) {
        shape.stopDrag()
        return
      }

      if (e.type === 'pointerdown') {
        const earlyExit = context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERDOWN, e)
        if (earlyExit) e.cancelBubble = true
      }

      if (e.type === 'dragstart' && e.evt.altKey) {
        shape.stopDrag()
        Shape2dPlugin.createCloneDrag(context, shape)
      }
    })

    shape.on('pointerdblclick', e => {
      if (context.state.mode !== CanvasMode.SELECT) return
      const earlyExit = context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERDBLCLICK, e)
      if (earlyExit) e.cancelBubble = true
    })

    const throttledPatch = throttle((shape: Konva.Shape) => {
      context.crdt.patch({ elements: [Shape2dPlugin.toTElement(shape)], groups: [] })
    }, 100)
    shape.on('dragmove', e => {
      const { x, y } = shape.absolutePosition();
      throttledPatch(shape)
    })

    shape.on('transform', e => {
    })

  }

  static createCloneDrag(context: IPluginContext, shape: Konva.Shape) {
    const previewShape = Shape2dPlugin.createPreviewClone(shape)
    if (!previewShape) return null

    context.dynamicLayer.add(previewShape)
    previewShape.startDrag()
    previewShape.on('dragend', () => {
      const newShape = Shape2dPlugin.createShapeFromNode(previewShape)
      previewShape.destroy()

      if (!newShape) return

      Shape2dPlugin.setupShapeListeners(context, newShape)
      newShape.moveToTop()
      newShape.setDraggable(true)
      context.staticForegroundLayer.add(newShape);
      context.crdt.patch({ elements: [Shape2dPlugin.toTElement(newShape)], groups: [] })
      context.setState('selection', [newShape])
    })

    return previewShape;
  }

  static createRectFromElement(element: TElement) {
    const data = element.data as TRectData
    const shape = new Konva.Rect({
      id: element.id,
      rotation: element.angle,
      x: element.x,
      y: element.y,
      width: data.w,
      height: data.h,
      fill: element.style.backgroundColor,
      draggable: false,
    });

    return shape
  }

  static createShapeFromNode(shape: Konva.Shape) {
    if (!(shape instanceof Konva.Rect)) return null

    return Shape2dPlugin.createRectFromElement({
      id: shape.id() || crypto.randomUUID(),
      angle: shape.rotation(),
      x: shape.x(),
      y: shape.y(),
      bindings: [],
      createdAt: Date.now(),
      locked: false,
      parentGroupId: null,
      updatedAt: Date.now(),
      zIndex: '',
      data: {
        type: 'rect',
        w: shape.width() * shape.scaleX(),
        h: shape.height() * shape.scaleY(),
      },
      style: {
        backgroundColor: shape.fill() as string || 'red',
      },
    })
  }

  static createPreviewClone(shape: Konva.Shape) {
    const newShape = Shape2dPlugin.createShapeFromNode(shape)
    if (!newShape) return null

    newShape.id(crypto.randomUUID())
    newShape.setDraggable(true)
    return newShape
  }

}
