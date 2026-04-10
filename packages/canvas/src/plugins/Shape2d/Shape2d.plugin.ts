import { TElement, TElementData } from "@vibecanvas/service-automerge/types/canvas-doc";
import Konva from "konva";
import type { TTool } from "../../components/FloatingCanvasToolbar/toolbar.types";
import { CustomEvents } from "../../custom-events";
import { CanvasMode } from "../../services/canvas/enum";
import type { IPlugin, IPluginContext } from "../shared/interface";
import { handleAttachedTextShortcut, createCloneDrag, finalizePreviewClone, setupShapeListeners } from "./Shape2d.drag";
import { getAttachedTextNode, createAttachedTextNode, syncAttachedTextToRect } from "./Shape2d.attached-text";
import {
  applyDiamondSize,
  createDiamondFromElement,
  createEllipseFromElement,
  createPreviewClone,
  createRectFromElement,
  createShapeFromElement,
  createShapeFromNode,
  createZeroSizeShapeData,
  getDiamondDimensions,
  getDiamondPoints,
  isDiamondNode,
  toTElement,
} from "./Shape2d.shared";
import { setupShape2dCapabilities, supportedTypes, updateShapeFromTElement } from "./Shape2d.capabilities";

export class Shape2dPlugin implements IPlugin {
  #previewDrawing: Konva.Shape | null = null;
  #previewOrigin: { x: number; y: number } | null = null;
  #activeTool: TTool = "select";
  static supportedTypes: Set<TElementData["type"]> = supportedTypes;

  apply(context: IPluginContext): void {
    this.setupPreview(context);
    Shape2dPlugin.setupCapablities(context);
    this.setupAttachedTextShortcut(context);
  }

  private setupAttachedTextShortcut(context: IPluginContext) {
    context.hooks.keydown.tap((event) => {
      handleAttachedTextShortcut({ context }, event);
    });
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
    });

    context.hooks.keydown.tap((event) => {
      if (event.key !== "Escape") return;
      if (context.state.mode !== CanvasMode.DRAW_CREATE) return;
      if (!this.#previewDrawing) return;

      event.preventDefault();
      event.stopPropagation();
      this.cancelPreview(context);
    });

    context.hooks.pointerDown.tap(() => {
      if (context.state.mode !== CanvasMode.DRAW_CREATE) return;
      if (!["rectangle", "diamond", "ellipse"].includes(this.#activeTool)) return;
      const pointer = context.dynamicLayer.getRelativePointerPosition();
      if (!pointer) return;

      this.#previewOrigin = { x: pointer.x, y: pointer.y };

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
        zIndex: "",
        data: Shape2dPlugin.createZeroSizeShapeData(this.#activeTool),
        style: {
          backgroundColor: "red",
        },
      };

      this.#previewDrawing = Shape2dPlugin.createShapeFromElement(element);
      if (this.#previewDrawing) context.dynamicLayer.add(this.#previewDrawing);
    });

    context.hooks.pointerMove.tap((e) => {
      if (context.state.mode !== CanvasMode.DRAW_CREATE) return;
      if (!this.#previewDrawing) return;
      if (!this.#previewOrigin) return;
      const pointer = context.dynamicLayer.getRelativePointerPosition();
      if (!pointer) return;

      const deltaX = pointer.x - this.#previewOrigin.x;
      const deltaY = pointer.y - this.#previewOrigin.y;
      const preserveRatio = e.evt.shiftKey;
      const size = preserveRatio ? Math.max(Math.abs(deltaX), Math.abs(deltaY)) : 0;
      const width = preserveRatio ? size : Math.abs(deltaX);
      const height = preserveRatio ? size : Math.abs(deltaY);
      const left = preserveRatio
        ? this.#previewOrigin.x + (deltaX < 0 ? -width : 0)
        : Math.min(this.#previewOrigin.x, pointer.x);
      const top = preserveRatio
        ? this.#previewOrigin.y + (deltaY < 0 ? -height : 0)
        : Math.min(this.#previewOrigin.y, pointer.y);

      if (this.#activeTool === "rectangle" && this.#previewDrawing instanceof Konva.Rect) {
        this.#previewDrawing.setAttrs({
          x: left,
          y: top,
          width: width,
          height: height,
        });
      } else if (this.#activeTool === "diamond" && Shape2dPlugin.isDiamondNode(this.#previewDrawing)) {
        Shape2dPlugin.applyDiamondSize(this.#previewDrawing, width, height);
        this.#previewDrawing.setAttrs({
          x: left,
          y: top,
        });
      } else if (this.#activeTool === "ellipse" && this.#previewDrawing instanceof Konva.Ellipse) {
        this.#previewDrawing.setAttrs({
          x: left + width / 2,
          y: top + height / 2,
          radiusX: width / 2,
          radiusY: height / 2,
        });
      }
    });

    context.hooks.pointerUp.tap(() => {
      if (context.state.mode !== CanvasMode.DRAW_CREATE) return;
      if (!this.#previewDrawing) return;
      const shape: Konva.Shape | undefined = this.#previewDrawing?.clone();
      this.cancelPreview(context);

      if (!shape) return;
      Shape2dPlugin.setupShapeListeners(context, shape);
      shape.setDraggable(true);
      context.staticForegroundLayer.add(shape);
      context.capabilities.renderOrder?.assignOrderOnInsert({
        parent: context.staticForegroundLayer,
        nodes: [shape],
        position: "front",
      });
      context.crdt.patch({ elements: [Shape2dPlugin.toTElement(shape)], groups: [] });
    });

    context.hooks.pointerCancel.tap(() => {
      if (context.state.mode !== CanvasMode.DRAW_CREATE) return;
      if (!this.#previewDrawing) return;
      this.cancelPreview(context);
    });

    context.hooks.destroy.tap(() => {
      this.#previewDrawing?.destroy();
      this.#previewDrawing = null;
      this.#previewOrigin = null;
    });
  }

  private cancelPreview(context: IPluginContext) {
    this.#previewDrawing?.destroy();
    this.#previewDrawing = null;
    this.#previewOrigin = null;
    context.setState("mode", CanvasMode.SELECT);
    context.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "select");
  }

  private static setupCapablities(context: IPluginContext) {
    setupShape2dCapabilities({ context });
  }

  private static getAttachedTextNode(context: IPluginContext, rect: Konva.Rect) {
    return getAttachedTextNode({ context }, rect);
  }

  private static createAttachedTextNode(context: IPluginContext, rect: Konva.Rect) {
    return createAttachedTextNode({ context }, rect);
  }

  private static syncAttachedTextToRect(context: IPluginContext, rect: Konva.Rect, textNode?: Konva.Text | null) {
    return syncAttachedTextToRect({ context }, { rect, textNode });
  }

  private static updateShapeFromTElement(context: IPluginContext, shape: Konva.Shape, element: TElement) {
    updateShapeFromTElement({ context }, { shape, element });
  }

  static toTElement(shape: Konva.Shape): TElement {
    return toTElement(shape);
  }

  static setupShapeListeners(context: IPluginContext, shape: Konva.Shape) {
    setupShapeListeners({ context }, shape);
  }

  static createCloneDrag(context: IPluginContext, shape: Konva.Shape) {
    return createCloneDrag({ context }, shape);
  }

  static finalizePreviewClone(context: IPluginContext, sourceShape: Konva.Shape, previewShape: Konva.Shape) {
    return finalizePreviewClone({ context }, { sourceShape, previewShape });
  }

  static createZeroSizeShapeData(tool: TTool): TElementData {
    return createZeroSizeShapeData(tool);
  }

  static createShapeFromElement(element: TElement): Konva.Shape | null {
    return createShapeFromElement(element);
  }

  static createRectFromElement(element: TElement) {
    return createRectFromElement(element);
  }

  static createDiamondFromElement(element: TElement) {
    return createDiamondFromElement(element);
  }

  static createEllipseFromElement(element: TElement) {
    return createEllipseFromElement(element);
  }

  static createShapeFromNode(shape: Konva.Shape) {
    return createShapeFromNode(shape);
  }

  static createPreviewClone(shape: Konva.Shape) {
    return createPreviewClone(shape);
  }

  static isDiamondNode(node: Konva.Node): node is Konva.Line {
    return isDiamondNode(node);
  }

  static getDiamondPoints(w: number, h: number) {
    return getDiamondPoints(w, h);
  }

  static getDiamondDimensions(shape: Konva.Line) {
    return getDiamondDimensions(shape);
  }

  static applyDiamondSize(shape: Konva.Line, w: number, h: number) {
    applyDiamondSize(shape, w, h);
  }
}
