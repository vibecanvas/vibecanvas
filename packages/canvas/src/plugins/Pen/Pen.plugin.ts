import type { TElement } from "@vibecanvas/automerge-service/types/canvas-doc";
import Konva from "konva";
import type { TTool } from "../../components/FloatingCanvasToolbar/toolbar.types";
import { CustomEvents } from "../../custom-events";
import { CanvasMode } from "../../services/canvas/enum";
import type { IPlugin, IPluginContext } from "../shared/interface";
import {
  createPenDataFromStrokePoints,
  type TStrokePoint,
} from "../shared/pen.math";
import { setupPenCapabilities } from "./pen.capabilities";
import { DEFAULT_FILL, DEFAULT_OPACITY, DEFAULT_STROKE_WIDTH } from "./pen.constants";
import {
  createPenPathFromElement,
  isPenNode,
  penPathToElement,
  updatePenPathFromElement,
} from "./pen.element";
import { createPenCloneDrag, createPenPreviewClone, finalizePenPreviewClone } from "./pen.clone";
import { penNodeToPositionPatch, safeStopPenDrag, setupPenShapeListeners } from "./pen.listeners";

export class PenPlugin implements IPlugin {
  #activeTool: TTool = "select";
  #points: TStrokePoint[] = [];
  #previewPath: Konva.Path | null = null;
  #draftElementId: string | null = null;

  apply(context: IPluginContext): void {
    this.setupToolState(context);
    this.setupDrawFlow(context);
    setupPenCapabilities(context);
    context.hooks.destroy.tap(() => {
      this.resetPreview();
      this.#points = [];
      this.#draftElementId = null;
    });
  }

  private setupToolState(context: IPluginContext) {
    context.hooks.customEvent.tap((event, payload) => {
      if (event !== CustomEvents.TOOL_SELECT) return false;

      this.#activeTool = payload as TTool;
      if (this.#activeTool !== "pen") {
        this.#points = [];
        this.resetPreview();
        this.#draftElementId = null;
      }
      return false;
    });
  }

  private setupDrawFlow(context: IPluginContext) {
    const cancelStroke = () => {
      this.#points = [];
      this.resetPreview();
      this.#draftElementId = null;
      context.setState("mode", CanvasMode.SELECT);
      context.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "select");
    };

    context.hooks.pointerDown.tap((event) => {
      if (context.state.mode !== CanvasMode.DRAW_CREATE) return;
      if (this.#activeTool !== "pen") return;

      const point = this.getPointerPoint(context, event.evt);
      if (!point) return;

      this.#points = [
        point,
        { ...point, x: point.x + 0.01, y: point.y + 0.01 },
      ];
      this.#draftElementId = crypto.randomUUID();
      this.syncPreview(context);
    });

    context.hooks.pointerMove.tap((event) => {
      if (context.state.mode !== CanvasMode.DRAW_CREATE) return;
      if (this.#activeTool !== "pen") return;
      if (this.#points.length === 0) return;

      const point = this.getPointerPoint(context, event.evt);
      if (!point) return;

      const previousPoint = this.#points[this.#points.length - 1];
      if (previousPoint && previousPoint.x === point.x && previousPoint.y === point.y) return;

      this.#points = [...this.#points, point];
      this.syncPreview(context);
    });

    const finalizeStroke = () => {
      if (context.state.mode !== CanvasMode.DRAW_CREATE) return;
      if (this.#activeTool !== "pen") return;

      const node = this.#previewPath?.clone();
      this.#points = [];
      this.resetPreview();
      this.#draftElementId = null;
      context.setState("mode", CanvasMode.SELECT);
      context.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "select");

      if (!(node instanceof Konva.Path)) return;

      setupPenShapeListeners(context, node);
      node.setDraggable(true);
      node.listening(true);
      node.visible(true);
      context.staticForegroundLayer.add(node);
      context.capabilities.renderOrder?.assignOrderOnInsert({
        parent: context.staticForegroundLayer,
        nodes: [node],
        position: "front",
      });
      const element = penPathToElement(node);
      context.crdt.patch({ elements: [element], groups: [] });
    };

    context.hooks.keydown.tap((event) => {
      if (event.key !== "Escape") return;
      if (context.state.mode !== CanvasMode.DRAW_CREATE) return;
      if (this.#activeTool !== "pen") return;
      if (!this.#previewPath) return;

      event.preventDefault();
      event.stopPropagation();
      cancelStroke();
    });

    context.hooks.pointerUp.tap(finalizeStroke);
    context.hooks.pointerCancel.tap(cancelStroke);
  }

  private getPointerPoint(context: IPluginContext, event?: MouseEvent | TouchEvent | PointerEvent): TStrokePoint | null {
    const pointer = context.dynamicLayer.getRelativePointerPosition();
    if (!pointer) return null;

    return {
      x: pointer.x,
      y: pointer.y,
      pressure: PenPlugin.getPressure(event),
    };
  }

  private syncPreview(context: IPluginContext) {
    const element = this.createElementFromPoints();
    const previewPath = this.ensurePreviewPath(context);
    if (!element) {
      this.resetPreview();
      return;
    }

    updatePenPathFromElement(previewPath, element);
    previewPath.listening(false);
    previewPath.visible(true);
    previewPath.getLayer()?.batchDraw();
  }

  private ensurePreviewPath(context: IPluginContext) {
    if (this.#previewPath) return this.#previewPath;

    const previewPath = new Konva.Path({
      data: "",
      fill: DEFAULT_FILL,
      opacity: DEFAULT_OPACITY,
      listening: false,
      visible: false,
      draggable: false,
    });

    context.dynamicLayer.add(previewPath);
    this.#previewPath = previewPath;
    return previewPath;
  }

  private resetPreview() {
    if (!this.#previewPath) return;

    this.#previewPath.destroy();
    this.#previewPath = null;
  }

  private createElementFromPoints(): TElement | null {
    const penData = createPenDataFromStrokePoints(this.#points);
    if (!penData) return null;

    return {
      id: this.#draftElementId ?? crypto.randomUUID(),
      x: penData.x,
      y: penData.y,
      rotation: 0,
      bindings: [],
      createdAt: Date.now(),
      locked: false,
      parentGroupId: null,
      updatedAt: Date.now(),
      zIndex: "",
      data: {
        type: "pen",
        points: penData.points,
        pressures: penData.pressures,
        simulatePressure: penData.simulatePressure,
      },
      style: {
        backgroundColor: DEFAULT_FILL,
        opacity: DEFAULT_OPACITY,
        strokeWidth: DEFAULT_STROKE_WIDTH,
      },
    };
  }

  private static getPressure(event?: MouseEvent | TouchEvent | PointerEvent) {
    if (event instanceof PointerEvent && Number.isFinite(event.pressure) && event.pressure > 0) {
      return event.pressure;
    }

    return 0.5;
  }

  static isPenNode(node: Konva.Node): node is Konva.Path {
    return isPenNode(node);
  }

  static createPathFromElement(element: TElement): Konva.Path {
    return createPenPathFromElement(element);
  }

  static updatePathFromElement(node: Konva.Path, element: TElement) {
    updatePenPathFromElement(node, element);
  }

  static toTElement(node: Konva.Path): TElement {
    return penPathToElement(node);
  }

  static createPreviewClone(node: Konva.Path) {
    return createPenPreviewClone(node);
  }

  static createCloneDrag(context: IPluginContext, node: Konva.Path) {
    return createPenCloneDrag(context, node);
  }

  static finalizePreviewClone(context: IPluginContext, previewClone: Konva.Path) {
    return finalizePenPreviewClone(context, previewClone);
  }

  static setupShapeListeners(context: IPluginContext, node: Konva.Path) {
    setupPenShapeListeners(context, node);
  }

  static safeStopDrag(node: Konva.Node) {
    safeStopPenDrag(node);
  }

  private static toPositionPatch(node: Konva.Path) {
    return penNodeToPositionPatch(node);
  }
}
