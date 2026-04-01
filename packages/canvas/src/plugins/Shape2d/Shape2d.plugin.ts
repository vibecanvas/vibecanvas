import { TElement, TElementData, TElementStyle, TDiamondData, TEllipseData, TRectData, TTextData } from "@vibecanvas/shell/automerge/index";
import Konva from "konva";
import type { TTool } from "../../components/FloatingCanvasToolbar/toolbar.types";
import { CustomEvents } from "../../custom-events";
import { CanvasMode } from "../../services/canvas/enum";
import type { IPlugin, IPluginContext } from "../shared/interface";
import { throttle } from "@solid-primitives/scheduled";
import { startSelectionCloneDrag } from "../shared/clone-drag";
import { getWorldPosition, setWorldPosition } from "../shared/node-space";
import { TextPlugin } from "../Text/Text.plugin";
import { TransformPlugin } from "../Transform/Transform.plugin";
import { getNodeZIndex, setNodeZIndex } from "../shared/render-order.shared";


export class Shape2dPlugin implements IPlugin {
  #previewDrawing: Konva.Shape | null = null;
  #previewOrigin: { x: number; y: number } | null = null;
  #activeTool: TTool = 'select';
  static supportedTypes: Set<TElementData['type']> = new Set(['rect', 'diamond', 'ellipse']);

  constructor() {

  }

  apply(context: IPluginContext): void {
    this.setupPreview(context);
    Shape2dPlugin.setupCapablities(context)
    this.setupAttachedTextShortcut(context)

  }

  private setupAttachedTextShortcut(context: IPluginContext) {
    context.hooks.keydown.tap((event) => {
      if (event.key !== 'Enter') return;
      if (context.state.mode !== CanvasMode.SELECT) return;
      if (context.state.editingTextId !== null) return;

      const activeSelection = TransformPlugin.filterSelection(context.state.selection);
      if (activeSelection.length !== 1) return;

      const rect = activeSelection[0];
      if (!(rect instanceof Konva.Rect)) return;

      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      if (target instanceof HTMLElement && target.isContentEditable) return;

      event.preventDefault();
      event.stopPropagation();

      let textNode = Shape2dPlugin.getAttachedTextNode(context, rect);
      const isNew = textNode === null;
      if (textNode === null) {
        textNode = Shape2dPlugin.createAttachedTextNode(context, rect);
      }

      Shape2dPlugin.syncAttachedTextToRect(context, rect, textNode);
      TextPlugin.enterEditMode(context, textNode, isNew);
    })
  }

  private setupPreview(context: IPluginContext) {
    context.hooks.customEvent.tap((event, payload) => {
      if (event === CustomEvents.TOOL_SELECT) {
        if (payload !== this.#activeTool && this.#previewDrawing) {
          this.cancelPreview(context);
        }
        this.#activeTool = payload;
      }
      return false;
    })

    context.hooks.keydown.tap((event) => {
      if (event.key !== 'Escape') return;
      if (context.state.mode !== CanvasMode.DRAW_CREATE) return;
      if (!this.#previewDrawing) return;

      event.preventDefault();
      event.stopPropagation();
      this.cancelPreview(context);
    })

    context.hooks.pointerDown.tap((e) => {
      if (context.state.mode !== CanvasMode.DRAW_CREATE) return;
      if (!['rectangle', 'diamond', 'ellipse'].includes(this.#activeTool)) return;
      const pointer = context.dynamicLayer.getRelativePointerPosition();
      if (!pointer) return;

      this.#previewOrigin = { x: pointer.x, y: pointer.y }

      const element: TElement = {
        id: crypto.randomUUID(),
        rotation: 0,
        x: pointer.x,
        y: pointer.y,
        bindings: [],
        createdAt: Date.now(),
        locked: false,
        parentGroupId: null,
        updatedAt: Date.now(),
        zIndex: '',
        data: Shape2dPlugin.createZeroSizeShapeData(this.#activeTool),
        style: {
          backgroundColor: 'red'
        }
      };

      this.#previewDrawing = Shape2dPlugin.createShapeFromElement(element);
      if (this.#previewDrawing) context.dynamicLayer.add(this.#previewDrawing);
    })

    context.hooks.pointerMove.tap((e) => {
      if (context.state.mode !== CanvasMode.DRAW_CREATE) return;
      if (!this.#previewDrawing) return;
      if (!this.#previewOrigin) return;
      const pointer = context.dynamicLayer.getRelativePointerPosition();
      if (!pointer) return;

      const deltaX = pointer.x - this.#previewOrigin.x
      const deltaY = pointer.y - this.#previewOrigin.y
      const preserveRatio = e.evt.shiftKey
      const size = preserveRatio ? Math.max(Math.abs(deltaX), Math.abs(deltaY)) : 0
      const width = preserveRatio ? size : Math.abs(deltaX)
      const height = preserveRatio ? size : Math.abs(deltaY)
      const left = preserveRatio
        ? this.#previewOrigin.x + (deltaX < 0 ? -width : 0)
        : Math.min(this.#previewOrigin.x, pointer.x)
      const top = preserveRatio
        ? this.#previewOrigin.y + (deltaY < 0 ? -height : 0)
        : Math.min(this.#previewOrigin.y, pointer.y)

      if (this.#activeTool === 'rectangle' && this.#previewDrawing instanceof Konva.Rect) {
        this.#previewDrawing.setAttrs({
          x: left,
          y: top,
          width: width,
          height: height,
        });
      } else if (this.#activeTool === 'diamond' && Shape2dPlugin.isDiamondNode(this.#previewDrawing)) {
        Shape2dPlugin.applyDiamondSize(this.#previewDrawing, width, height)
        this.#previewDrawing.setAttrs({
          x: left,
          y: top,
        });
      } else if (this.#activeTool === 'ellipse' && this.#previewDrawing instanceof Konva.Ellipse) {
        this.#previewDrawing.setAttrs({
          x: left + width / 2,
          y: top + height / 2,
          radiusX: width / 2,
          radiusY: height / 2,
        });
      }
    })

    context.hooks.pointerUp.tap(() => {
      if (context.state.mode !== CanvasMode.DRAW_CREATE) return;
      if (!this.#previewDrawing) return;
      const shape: Konva.Shape | undefined = this.#previewDrawing?.clone()
      this.cancelPreview(context);

      if (!shape) return;
      Shape2dPlugin.setupShapeListeners(context, shape)
      shape.setDraggable(true)
      context.staticForegroundLayer.add(shape);
      context.capabilities.renderOrder?.assignOrderOnInsert({
        parent: context.staticForegroundLayer,
        nodes: [shape],
        position: "front",
      })
      context.crdt.patch({ elements: [Shape2dPlugin.toTElement(shape)], groups: [] })
    })

    context.hooks.pointerCancel.tap(() => {
      if (context.state.mode !== CanvasMode.DRAW_CREATE) return;
      if (!this.#previewDrawing) return;
      this.cancelPreview(context);
    })

    context.hooks.destroy.tap(() => {
      this.#previewDrawing?.destroy();
      this.#previewDrawing = null;
      this.#previewOrigin = null;
    })
  }

  private cancelPreview(context: IPluginContext) {
    this.#previewDrawing?.destroy();
    this.#previewDrawing = null;
    this.#previewOrigin = null;
    context.setState('mode', CanvasMode.SELECT)
    context.hooks.customEvent.call(CustomEvents.TOOL_SELECT, 'select')
  }

  private static setupCapablities(context: IPluginContext) {
    const currentCreateShapeFromTElement = context.capabilities.createShapeFromTElement
    context.capabilities.createShapeFromTElement = (element) => {
      if (!Shape2dPlugin.supportedTypes.has(element.data.type)) {
        return currentCreateShapeFromTElement?.(element) || null
      } else {
        const shape = Shape2dPlugin.createShapeFromElement(element)
        if (shape) {
          Shape2dPlugin.setupShapeListeners(context, shape)
          shape.setDraggable(true)
        }
        return shape
      }
    }

      const currentToElement = context.capabilities.toElement
      context.capabilities.toElement = (node) => {
        if (node instanceof Konva.Rect || node instanceof Konva.Ellipse || Shape2dPlugin.isDiamondNode(node)) {
          return Shape2dPlugin.toTElement(node)
        }
        return currentToElement?.(node) || null
      }

      const previousGetBundle = context.capabilities.getReorderBundle
      context.capabilities.getReorderBundle = (node) => {
        // Attached text is rect-only; don't bundle other shapes with text
        if (!(node instanceof Konva.Rect)) {
          return previousGetBundle?.(node) ?? [node]
        }

        const attachedText = Shape2dPlugin.getAttachedTextNode(context, node)
        if (!attachedText || attachedText.getParent() !== node.getParent()) {
          return previousGetBundle?.(node) ?? [node]
        }

        return [node, attachedText]
      }

    const previousUpdate = context.capabilities.updateShapeFromTElement
    context.capabilities.updateShapeFromTElement = (element) => {
      if (!Shape2dPlugin.supportedTypes.has(element.data.type)) {
        return previousUpdate?.(element) || null
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

  private static getAttachedTextNode(context: IPluginContext, rect: Konva.Rect) {
    return TextPlugin.findAttachedTextByContainerId(context, rect.id());
  }

  private static createAttachedTextNode(context: IPluginContext, rect: Konva.Rect) {
    const parent = rect.getParent();
    const parentGroupId = parent instanceof Konva.Group ? parent.id() : null;
    const textElement: TElement = {
      id: crypto.randomUUID(),
      x: rect.x(),
      y: rect.y(),
      rotation: rect.rotation(),
      bindings: [],
      createdAt: Date.now(),
      locked: false,
      parentGroupId,
      updatedAt: Date.now(),
      zIndex: '',
      style: {
        opacity: rect.opacity(),
      },
      data: {
        type: 'text',
        w: Math.max(4, rect.width()),
        h: Math.max(4, rect.height()),
        text: '',
        originalText: '',
        fontSize: Math.max(14, Math.min(24, rect.height() * 0.35)),
        fontFamily: 'Arial',
        textAlign: 'center',
        verticalAlign: 'middle',
        lineHeight: 1.2,
        link: null,
        containerId: rect.id(),
        autoResize: false,
      },
    };

      const textParent = parent instanceof Konva.Group || parent instanceof Konva.Layer
        ? parent
        : context.staticForegroundLayer
      const textNode = TextPlugin.createTextNode(textElement);
      textParent.add(textNode);
      context.capabilities.renderOrder?.assignOrderOnInsert({
        parent: textParent,
        nodes: [rect, textNode],
        position: "front",
      });
      context.crdt.patch({ elements: [TextPlugin.toTElement(textNode)], groups: [] });

    return textNode;
  }

  private static syncAttachedTextToRect(context: IPluginContext, rect: Konva.Rect, textNode?: Konva.Text | null) {
    const attachedText = textNode ?? Shape2dPlugin.getAttachedTextNode(context, rect);
    if (!attachedText) return null;

    const parent = rect.getParent();
    if (parent && attachedText.getParent() !== parent) {
      parent.add(attachedText);
    }

    TextPlugin.syncAttachedTextToRect(rect, attachedText);

    attachedText.name(TextPlugin.ATTACHED_TEXT_NAME);
    attachedText.setAttr('vcContainerId', rect.id());

    const linkedElement = TextPlugin.toTElement(attachedText);
    linkedElement.parentGroupId = parent instanceof Konva.Group ? parent.id() : null;
    context.crdt.patch({ elements: [linkedElement], groups: [] });

    return attachedText;
  }

  private static updateShapeFromTElement(context: IPluginContext, shape: Konva.Shape, element: TElement) {
    if (shape instanceof Konva.Ellipse && element.data.type === 'ellipse') {
      const nextPosition = {
        x: element.x + element.data.rx,
        y: element.y + element.data.ry,
      }
      const worldPosition = getWorldPosition(shape)
      if (worldPosition.x !== nextPosition.x || worldPosition.y !== nextPosition.y) {
        setWorldPosition(shape, nextPosition)
      }
    } else {
      const worldPosition = getWorldPosition(shape)
      if (worldPosition.x !== element.x || worldPosition.y !== element.y) {
        setWorldPosition(shape, { x: element.x, y: element.y })
      }
    }

    if (shape.rotation() !== element.rotation) shape.rotation(element.rotation)
    if (shape.scaleX() !== 1) shape.scaleX(1)
    if (shape.scaleY() !== 1) shape.scaleY(1)
    if (element.style.backgroundColor !== shape.fill()) shape.fill(element.style.backgroundColor)
    if (element.style.strokeColor !== shape.stroke()) shape.stroke(element.style.strokeColor)
    if (element.style.strokeWidth !== shape.strokeWidth()) shape.strokeWidth(element.style.strokeWidth)
    if (element.style.opacity !== shape.opacity()) shape.opacity(element.style.opacity)
    setNodeZIndex(shape, element.zIndex)

    if (element.data.type === 'rect' && shape instanceof Konva.Rect) {
      if (shape.width() !== element.data.w) shape.width(element.data.w)
      if (shape.height() !== element.data.h) shape.height(element.data.h)
    } else if (element.data.type === 'diamond' && Shape2dPlugin.isDiamondNode(shape)) {
      Shape2dPlugin.applyDiamondSize(shape, element.data.w, element.data.h)
    } else if (element.data.type === 'ellipse' && shape instanceof Konva.Ellipse) {
      if (shape.radiusX() !== element.data.rx) shape.radiusX(element.data.rx)
      if (shape.radiusY() !== element.data.ry) shape.radiusY(element.data.ry)
    }

    if (element.data.type === 'rect' && shape instanceof Konva.Rect) {
      Shape2dPlugin.syncAttachedTextToRect(context, shape)
    }
  }

  static toTElement(shape: Konva.Shape): TElement {
    let data!: TElementData
    let x!: number
    let y!: number

    if (shape instanceof Konva.Rect) {
      const absoluteScale = shape.getAbsoluteScale()
      const layer = shape.getLayer()
      const layerScaleX = layer?.scaleX() ?? 1
      const layerScaleY = layer?.scaleY() ?? 1
      data = {
        type: 'rect',
        w: shape.width() * (absoluteScale.x / layerScaleX),
        h: shape.height() * (absoluteScale.y / layerScaleY),
      }
      const position = getWorldPosition(shape)
      x = position.x
      y = position.y
    } else if (shape instanceof Konva.Ellipse) {
      const absoluteScale = shape.getAbsoluteScale()
      const layer = shape.getLayer()
      const layerScaleX = layer?.scaleX() ?? 1
      const layerScaleY = layer?.scaleY() ?? 1
      const rx = shape.radiusX() * (absoluteScale.x / layerScaleX)
      const ry = shape.radiusY() * (absoluteScale.y / layerScaleY)
      data = {
        type: 'ellipse',
        rx,
        ry,
      }
      const position = getWorldPosition(shape)
      x = position.x - rx
      y = position.y - ry
    } else if (Shape2dPlugin.isDiamondNode(shape)) {
      const { w, h } = Shape2dPlugin.getDiamondDimensions(shape)
      data = {
        type: 'diamond',
        w,
        h,
      }
      const position = getWorldPosition(shape)
      x = position.x
      y = position.y
    } else {
      throw new Error('Unsupported shape type')
    }

    let style: TElementStyle = {
      opacity: shape.opacity(),
      strokeWidth: shape.strokeWidth(),
    }

    if (typeof shape.fill() === 'string') style.backgroundColor = shape.fill() as string
    if (typeof shape.stroke() === 'string') style.strokeColor = shape.stroke() as string
    const parent = shape.getParent()
    const parentGroupId = parent instanceof Konva.Group ? parent.id() : null

    return {
      id: shape.id(),
      rotation: shape.getAbsoluteRotation(),
      x,
      y,
      bindings: [],
      createdAt: Date.now(),
      locked: false,
      parentGroupId,
      updatedAt: Date.now(),
      zIndex: getNodeZIndex(shape),
      data,
      style,
    }
  }

  static setupShapeListeners(context: IPluginContext, shape: Konva.Shape) {
    let originalElement: TElement | null = null
    const multiDragStartPositions = new Map<string, { x: number; y: number }>()
    const passengerOriginalElements = new Map<string, TElement[]>()

    shape.on('pointerclick', e => {
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
        if (startSelectionCloneDrag(context, shape)) return
        Shape2dPlugin.createCloneDrag(context, shape)
      }
    })

    shape.on('pointerdblclick', e => {
      if (context.state.mode !== CanvasMode.SELECT) return
      const earlyExit = context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERDBLCLICK, e)
      if (earlyExit) e.cancelBubble = true
    })

    const applyElement = (element: TElement) => {
      context.capabilities.updateShapeFromTElement?.(element)
      let parent = shape.getParent()

      while (parent instanceof Konva.Group) {
        parent.fire('transform')
        parent = parent.getParent()
      }
    }

    const throttledPatch = throttle((element: TElement) => {
      context.crdt.patch({ elements: [element], groups: [] })
    }, 100)

    shape.on('dragstart', e => {
      originalElement = Shape2dPlugin.toTElement(shape)
      // Capture start positions of all selected nodes for multi-drag sync
      multiDragStartPositions.clear()
      passengerOriginalElements.clear()
      const selected = TransformPlugin.filterSelection(context.state.selection)
      selected.forEach(n => {
        multiDragStartPositions.set(n.id(), { ...n.absolutePosition() })
        if (n === shape) return
        if (n instanceof Konva.Shape) {
          const el = context.capabilities.toElement?.(n)
          if (el) passengerOriginalElements.set(n.id(), [structuredClone(el)])
        } else if (n instanceof Konva.Group) {
          const childEls = (n.find((child: Konva.Node) => child instanceof Konva.Shape) as Konva.Shape[])
            .map(child => context.capabilities.toElement?.(child))
            .filter(Boolean) as TElement[]
          passengerOriginalElements.set(n.id(), structuredClone(childEls))
        }
      })
    })

    shape.on('dragmove', e => {
      throttledPatch(Shape2dPlugin.toTElement(shape))
      // Attached text is rect-only - don't sync for diamond/ellipse
      if (shape instanceof Konva.Rect) {
        Shape2dPlugin.syncAttachedTextToRect(context, shape)
      }
      // Sync other selected nodes by the same delta.
      // Skip nodes already dragging independently (e.g. via Transformer proxyDrag)
      // to avoid conflicting with Konva's own drag tracking.
      const selected = TransformPlugin.filterSelection(context.state.selection)
      if (selected.length <= 1) return
      const start = multiDragStartPositions.get(shape.id())
      if (!start) return
      const cur = shape.absolutePosition()
      const dx = cur.x - start.x
      const dy = cur.y - start.y
      selected.forEach(other => {
        if (other === shape) return
        if (other.isDragging()) return
        const os = multiDragStartPositions.get(other.id())
        if (!os) return
        other.absolutePosition({ x: os.x + dx, y: os.y + dy })
      })
    })

    shape.on('dragend', e => {
      const nextElement = Shape2dPlugin.toTElement(shape)
      const beforeElement = originalElement ? structuredClone(originalElement) : null
      const afterElement = structuredClone(nextElement)

      context.crdt.patch({ elements: [afterElement], groups: [] })
      if (shape instanceof Konva.Rect) {
        Shape2dPlugin.syncAttachedTextToRect(context, shape)
      }

      // Patch CRDT for passenger nodes that moved with this shape
      const selected = TransformPlugin.filterSelection(context.state.selection)
      const passengers = selected.filter(n => n !== shape)
      const passengerAfterElements = new Map<string, TElement[]>()
      passengers.forEach(passenger => {
        if (passenger instanceof Konva.Shape) {
          const el = context.capabilities.toElement?.(passenger)
          if (el) {
            const els = [structuredClone(el)]
            passengerAfterElements.set(passenger.id(), els)
            context.crdt.patch({ elements: els, groups: [] })
          }
        } else if (passenger instanceof Konva.Group) {
          const childEls = (passenger.find((child: Konva.Node) => child instanceof Konva.Shape) as Konva.Shape[])
            .map(child => context.capabilities.toElement?.(child))
            .filter(Boolean) as TElement[]
          const cloned = structuredClone(childEls)
          passengerAfterElements.set(passenger.id(), cloned)
          if (cloned.length > 0) context.crdt.patch({ elements: cloned, groups: [] })
        }
      })

      if (!beforeElement) return

      const didMove = beforeElement.x !== afterElement.x || beforeElement.y !== afterElement.y
      const capturedStartPositions = new Map(multiDragStartPositions)
      const capturedPassengerOriginals = new Map(passengerOriginalElements)
      multiDragStartPositions.clear()
      originalElement = null
      if (!didMove) return

      context.history.record({
        label: 'drag-shape',
        undo() {
          applyElement(beforeElement)
          context.crdt.patch({ elements: [beforeElement], groups: [] })
          if (shape instanceof Konva.Rect) {
            Shape2dPlugin.syncAttachedTextToRect(context, shape)
          }
          // Restore passengers to their original positions
          passengers.forEach(passenger => {
            const startPos = capturedStartPositions.get(passenger.id())
            if (startPos) passenger.absolutePosition(startPos)
            const originalEls = capturedPassengerOriginals.get(passenger.id())
            if (originalEls && originalEls.length > 0) {
              context.crdt.patch({ elements: originalEls, groups: [] })
            }
          })
        },
        redo() {
          applyElement(afterElement)
          context.crdt.patch({ elements: [afterElement], groups: [] })
          if (shape instanceof Konva.Rect) {
            Shape2dPlugin.syncAttachedTextToRect(context, shape)
          }
          // Restore passengers to their after-drag positions
          passengers.forEach(passenger => {
            const afterEls = passengerAfterElements.get(passenger.id())
            if (!afterEls || afterEls.length === 0) return
            if (passenger instanceof Konva.Shape) {
              context.capabilities.updateShapeFromTElement?.(afterEls[0])
              context.crdt.patch({ elements: afterEls, groups: [] })
            } else if (passenger instanceof Konva.Group) {
              const afterPos = passengerAfterElements.get(passenger.id())
              const startPos = capturedStartPositions.get(passenger.id())
              const afterStart = capturedStartPositions.get(shape.id())
              const afterCur = afterElement
              if (startPos && afterStart) {
                const dx = afterCur.x - beforeElement.x
                const dy = afterCur.y - beforeElement.y
                passenger.absolutePosition({ x: startPos.x + dx, y: startPos.y + dy })
              }
              if (afterPos && afterPos.length > 0) context.crdt.patch({ elements: afterPos, groups: [] })
            }
          })
        },
      })
    })

    shape.on('transform', e => {
      if (shape instanceof Konva.Rect) {
        Shape2dPlugin.syncAttachedTextToRect(context, shape)
      }
    })

  }

  static createCloneDrag(context: IPluginContext, shape: Konva.Shape) {
    const previewShape = Shape2dPlugin.createPreviewClone(shape)
    if (!previewShape) return null

    context.dynamicLayer.add(previewShape)
    previewShape.startDrag()
    previewShape.on('dragend', () => {
      const newShape = Shape2dPlugin.finalizePreviewClone(context, shape, previewShape)
      if (!newShape) return
      context.setState('selection', [newShape])
    })

    return previewShape;
  }

  static finalizePreviewClone(context: IPluginContext, sourceShape: Konva.Shape, previewShape: Konva.Shape) {
    const newShape = Shape2dPlugin.createShapeFromNode(previewShape)
    previewShape.destroy()

    if (!newShape) return null

    Shape2dPlugin.setupShapeListeners(context, newShape)
    newShape.setDraggable(true)
    context.staticForegroundLayer.add(newShape)
    context.capabilities.renderOrder?.assignOrderOnInsert({
      parent: context.staticForegroundLayer,
      nodes: [newShape],
      position: "front",
    })

    const createdElements: TElement[] = [Shape2dPlugin.toTElement(newShape)]
    if (sourceShape instanceof Konva.Rect && newShape instanceof Konva.Rect) {
      const sourceAttachedText = Shape2dPlugin.getAttachedTextNode(context, sourceShape)
      if (sourceAttachedText) {
        const sourceElement = TextPlugin.toTElement(sourceAttachedText)
        if (sourceElement.data.type !== 'text') {
          throw new Error('Expected attached text element data to be text')
        }
        const sourceTextData: TTextData = sourceElement.data
        const clonedText = TextPlugin.createTextNode({
          ...sourceElement,
          id: crypto.randomUUID(),
          x: newShape.x(),
          y: newShape.y(),
          rotation: newShape.rotation(),
          parentGroupId: null,
          data: {
            ...sourceTextData,
            containerId: newShape.id(),
            originalText: sourceTextData.text,
          },
        })

        TextPlugin.setupShapeListeners(context, clonedText)
        context.staticForegroundLayer.add(clonedText)
        context.capabilities.renderOrder?.assignOrderOnInsert({
          parent: context.staticForegroundLayer,
          nodes: [newShape, clonedText],
          position: "front",
        })
        Shape2dPlugin.syncAttachedTextToRect(context, newShape, clonedText)
        createdElements.push(TextPlugin.toTElement(clonedText))
      }
    }

    context.crdt.patch({ elements: createdElements, groups: [] })
    return newShape
  }

  static createZeroSizeShapeData(tool: TTool): TElementData {
    if (tool === 'rectangle') {
      return { type: 'rect', w: 0, h: 0 }
    } else if (tool === 'diamond') {
      return { type: 'diamond', w: 0, h: 0 }
    } else if (tool === 'ellipse') {
      return { type: 'ellipse', rx: 0, ry: 0 }
    }
    throw new Error(`Unknown shape tool: ${tool}`)
  }

  static createShapeFromElement(element: TElement): Konva.Shape | null {
    if (element.data.type === 'rect') {
      return Shape2dPlugin.createRectFromElement(element)
    } else if (element.data.type === 'diamond') {
      return Shape2dPlugin.createDiamondFromElement(element)
    } else if (element.data.type === 'ellipse') {
      return Shape2dPlugin.createEllipseFromElement(element)
    }
    return null
  }

  static createRectFromElement(element: TElement) {
    const data = element.data as TRectData
    const shape = new Konva.Rect({
      id: element.id,
      rotation: element.rotation,
      x: element.x,
      y: element.y,
      width: data.w,
      height: data.h,
      fill: element.style.backgroundColor,
      stroke: element.style.strokeColor,
      strokeWidth: element.style.strokeWidth,
      opacity: element.style.opacity,
      draggable: false,
    });

    setNodeZIndex(shape, element.zIndex)

    return shape
  }

  static createDiamondFromElement(element: TElement) {
    const data = element.data as TDiamondData
    const shape = new Konva.Line({
      id: element.id,
      rotation: element.rotation,
      x: element.x,
      y: element.y,
      closed: true,
      points: Shape2dPlugin.getDiamondPoints(data.w, data.h),
      fill: element.style.backgroundColor,
      stroke: element.style.strokeColor,
      strokeWidth: element.style.strokeWidth,
      opacity: element.style.opacity,
      draggable: false,
    });
    shape.setAttr('vcShape2dType', 'diamond')

    setNodeZIndex(shape, element.zIndex)

    return shape
  }

  static createEllipseFromElement(element: TElement) {
    const data = element.data as TEllipseData
    const shape = new Konva.Ellipse({
      id: element.id,
      rotation: element.rotation,
      x: element.x + data.rx,
      y: element.y + data.ry,
      radiusX: data.rx,
      radiusY: data.ry,
      fill: element.style.backgroundColor,
      stroke: element.style.strokeColor,
      strokeWidth: element.style.strokeWidth,
      opacity: element.style.opacity,
      draggable: false,
    });

    setNodeZIndex(shape, element.zIndex)

    return shape
  }

  static createShapeFromNode(shape: Konva.Shape) {
    if (!(shape instanceof Konva.Rect) && !(shape instanceof Konva.Ellipse) && !Shape2dPlugin.isDiamondNode(shape)) {
      return null
    }

    const element = Shape2dPlugin.toTElement(shape)
    return Shape2dPlugin.createShapeFromElement({
      ...element,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  }

  static createPreviewClone(shape: Konva.Shape) {
    const newShape = Shape2dPlugin.createShapeFromNode(shape)
    if (!newShape) return null

    newShape.id(crypto.randomUUID())
    newShape.setDraggable(true)
    return newShape
  }

  static isDiamondNode(node: Konva.Node): node is Konva.Line {
    return node instanceof Konva.Line && node.closed() === true && node.getAttr('vcShape2dType') === 'diamond'
  }

  static getDiamondPoints(w: number, h: number) {
    return [
      w / 2, 0,
      w, h / 2,
      w / 2, h,
      0, h / 2,
    ]
  }

  static getDiamondDimensions(shape: Konva.Line) {
    const points = shape.points()
    const xs = points.filter((_, index) => index % 2 === 0)
    const ys = points.filter((_, index) => index % 2 === 1)
    const baseWidth = Math.max(...xs, 0) - Math.min(...xs, 0)
    const baseHeight = Math.max(...ys, 0) - Math.min(...ys, 0)
    const absoluteScale = shape.getAbsoluteScale()
    const layer = shape.getLayer()
    const layerScaleX = layer?.scaleX() ?? 1
    const layerScaleY = layer?.scaleY() ?? 1

    return {
      w: baseWidth * (absoluteScale.x / layerScaleX),
      h: baseHeight * (absoluteScale.y / layerScaleY),
    }
  }

  static applyDiamondSize(shape: Konva.Line, w: number, h: number) {
    shape.points(Shape2dPlugin.getDiamondPoints(w, h))
  }

}
