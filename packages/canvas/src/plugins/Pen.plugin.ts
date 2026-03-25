import { throttle } from "@solid-primitives/scheduled";
import { TElement, TElementStyle, TPenData } from "@vibecanvas/shell/automerge/index";
import Konva from "konva";
import type { TTool } from "../components/FloatingCanvasToolbar/toolbar.types";
import { CustomEvents } from "../custom-events";
import { CanvasMode } from "../services/canvas/enum";
import type { IPlugin, IPluginContext } from "./interface";
import {
  createPenDataFromStrokePoints,
  getStrokePathFromPenData,
  scalePenDataPoints,
  type TStrokePoint,
} from "./pen.math";
import { TransformPlugin } from "./Transform.plugin";

const DEFAULT_FILL = "#0f172a";
const DEFAULT_OPACITY = 0.92;
const DEFAULT_STROKE_WIDTH = 7;

export class PenPlugin implements IPlugin {
  #activeTool: TTool = "select";
  #points: TStrokePoint[] = [];
  #previewPath: Konva.Path | null = null;
  #draftElementId: string | null = null;

  apply(context: IPluginContext): void {
    this.setupToolState(context);
    this.setupDrawFlow(context);
    PenPlugin.setupCapabilities(context);
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

      PenPlugin.setupShapeListeners(context, node);
      node.setDraggable(true);
      node.listening(true);
      node.visible(true);
      context.staticForegroundLayer.add(node);
      const element = PenPlugin.toTElement(node);
      context.crdt.patch({ elements: [element], groups: [] });
    };

    const cancelStroke = () => {
      this.#points = [];
      this.resetPreview();
      this.#draftElementId = null;
    };

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

    PenPlugin.updatePathFromElement(previewPath, element);
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
      angle: 0,
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

  private static setupCapabilities(context: IPluginContext) {
    const previousCreate = context.capabilities.createShapeFromTElement;
    context.capabilities.createShapeFromTElement = (element) => {
      if (element.data.type !== "pen") return previousCreate?.(element) ?? null;

      const node = PenPlugin.createPathFromElement(element);
      PenPlugin.setupShapeListeners(context, node);
      node.draggable(true);
      return node;
    };

    const previousToElement = context.capabilities.toElement;
    context.capabilities.toElement = (node) => {
      if (node instanceof Konva.Path && PenPlugin.isPenPath(node)) {
        return PenPlugin.toTElement(node);
      }
      return previousToElement?.(node) ?? null;
    };

    const previousUpdate = context.capabilities.updateShapeFromTElement;
    context.capabilities.updateShapeFromTElement = (element) => {
      if (element.data.type !== "pen") return previousUpdate?.(element) ?? null;

      const node = context.staticForegroundLayer.findOne((candidate: Konva.Node) => {
        return candidate instanceof Konva.Path && candidate.id() === element.id;
      });

      if (!(node instanceof Konva.Path)) return null;

      PenPlugin.updatePathFromElement(node, element);
      return node;
    };
  }

  private static getPressure(event?: MouseEvent | TouchEvent | PointerEvent) {
    if (event instanceof PointerEvent && Number.isFinite(event.pressure) && event.pressure > 0) {
      return event.pressure;
    }

    return 0.5;
  }

  private static getStrokeWidthFromStyle(style: TElementStyle) {
    return style.strokeWidth ?? DEFAULT_STROKE_WIDTH;
  }

  private static getFillFromStyle(style: TElementStyle) {
    return style.backgroundColor ?? style.strokeColor ?? DEFAULT_FILL;
  }

  private static getColorStyleKey(style: TElementStyle): "backgroundColor" | "strokeColor" {
    if (typeof style.strokeColor === "string" && typeof style.backgroundColor !== "string") {
      return "strokeColor";
    }

    return "backgroundColor";
  }

  private static isPenPath(node: Konva.Path) {
    const data = node.getAttr("vcElementData") as TPenData | undefined;
    return data?.type === "pen";
  }

  static isPenNode(node: Konva.Node): node is Konva.Path {
    return node instanceof Konva.Path && PenPlugin.isPenPath(node);
  }

  private static createStyleFromNode(node: Konva.Path, baseStyle: TElementStyle): TElementStyle {
    const fill = typeof node.fill() === "string" ? node.fill() : DEFAULT_FILL;
    const style: TElementStyle = {
      ...structuredClone(baseStyle),
      opacity: node.opacity(),
      strokeWidth: node.getAttr("vcPenStrokeWidth") ?? DEFAULT_STROKE_WIDTH,
    };

    const colorStyleKey = PenPlugin.getColorStyleKey(baseStyle);
    delete style.backgroundColor;
    delete style.strokeColor;
    style[colorStyleKey] = fill;

    return style;
  }

  static createPathFromElement(element: TElement): Konva.Path {
    if (element.data.type !== "pen") {
      throw new Error("Unsupported element type for PenPlugin");
    }

    const node = new Konva.Path({
      id: element.id,
      x: element.x,
      y: element.y,
      rotation: element.angle,
      data: getStrokePathFromPenData(element, {
        size: PenPlugin.getStrokeWidthFromStyle(element.style),
      }),
      fill: PenPlugin.getFillFromStyle(element.style),
      opacity: element.style.opacity ?? DEFAULT_OPACITY,
      listening: true,
      draggable: false,
    });

    node.setAttr("vcElementData", structuredClone(element.data));
    node.setAttr("vcElementStyle", structuredClone(element.style));
    node.setAttr("vcPenStrokeWidth", PenPlugin.getStrokeWidthFromStyle(element.style));
    return node;
  }

  static updatePathFromElement(node: Konva.Path, element: TElement) {
    if (element.data.type !== "pen") return;

    node.setAbsolutePosition({ x: element.x, y: element.y });
    node.rotation(element.angle);
    node.data(getStrokePathFromPenData(element, {
      size: PenPlugin.getStrokeWidthFromStyle(element.style),
    }));
    node.fill(PenPlugin.getFillFromStyle(element.style));
    node.opacity(element.style.opacity ?? DEFAULT_OPACITY);
    node.scale({ x: 1, y: 1 });
    node.setAttr("vcElementData", structuredClone(element.data));
    node.setAttr("vcElementStyle", structuredClone(element.style));
    node.setAttr("vcPenStrokeWidth", PenPlugin.getStrokeWidthFromStyle(element.style));
  }

  static toTElement(node: Konva.Path): TElement {
    const baseData = structuredClone(node.getAttr("vcElementData") as TPenData | undefined);
    if (!baseData || baseData.type !== "pen") {
      throw new Error("Pen path is missing vcElementData metadata");
    }

    const baseStyle = structuredClone((node.getAttr("vcElementStyle") as TElementStyle | undefined) ?? {});
    const absoluteScale = node.getAbsoluteScale();
    const layer = node.getLayer();
    const layerScaleX = layer?.scaleX() ?? 1;
    const layerScaleY = layer?.scaleY() ?? 1;
    const scaleX = absoluteScale.x / layerScaleX;
    const scaleY = absoluteScale.y / layerScaleY;
    const absolutePosition = node.absolutePosition();
    const parent = node.getParent();
    const parentGroupId = parent instanceof Konva.Group ? parent.id() : null;

    return {
      id: node.id(),
      angle: node.getAbsoluteRotation(),
      x: absolutePosition.x,
      y: absolutePosition.y,
      bindings: [],
      createdAt: Date.now(),
      locked: false,
      parentGroupId,
      updatedAt: Date.now(),
      zIndex: "",
      data: {
        ...baseData,
        points: scalePenDataPoints(baseData.points, scaleX, scaleY),
      },
      style: PenPlugin.createStyleFromNode(node, baseStyle),
    };
  }

  static createPreviewClone(node: Konva.Path) {
    const element = PenPlugin.toTElement(node);
    const clone = PenPlugin.createPathFromElement({
      ...element,
      id: crypto.randomUUID(),
      parentGroupId: null,
      data: structuredClone(element.data),
      style: structuredClone(element.style),
    });

    clone.setDraggable(true);
    return clone;
  }

  static createCloneDrag(context: IPluginContext, node: Konva.Path) {
    const previewClone = PenPlugin.createPreviewClone(node);
    context.dynamicLayer.add(previewClone);
    previewClone.startDrag();

    const finalizeCloneDrag = () => {
      previewClone.off("dragend", finalizeCloneDrag);
      if (previewClone.isDragging()) {
        previewClone.stopDrag();
      }

      previewClone.moveTo(context.staticForegroundLayer);
      PenPlugin.setupShapeListeners(context, previewClone);
      previewClone.setDraggable(true);
      context.crdt.patch({ elements: [PenPlugin.toTElement(previewClone)], groups: [] });
      context.setState("selection", [previewClone]);
    };

    previewClone.on("dragend", finalizeCloneDrag);
    return previewClone;
  }

  static setupShapeListeners(context: IPluginContext, node: Konva.Path) {
    let originalElement: TElement | null = null;
    let isCloneDrag = false;
    const multiDragStartPositions = new Map<string, { x: number; y: number }>();
    const passengerOriginalElements = new Map<string, TElement[]>();

    node.on("pointerclick", (event) => {
      if (context.state.mode !== CanvasMode.SELECT) return;
      context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERCLICK, event);
    });

    node.on("pointerdown dragstart", (event) => {
      if (context.state.mode !== CanvasMode.SELECT) {
        PenPlugin.safeStopDrag(node);
        return;
      }

      if (event.type === "pointerdown") {
        const earlyExit = context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERDOWN, event);
        if (earlyExit) event.cancelBubble = true;
      }

      if (event.type === "dragstart" && event.evt?.altKey) {
        isCloneDrag = true;
        PenPlugin.safeStopDrag(node);
        PenPlugin.createCloneDrag(context, node);
      }
    });

    node.on("pointerdblclick", (event) => {
      if (context.state.mode !== CanvasMode.SELECT) return;
      const earlyExit = context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERDBLCLICK, event);
      if (earlyExit) event.cancelBubble = true;
    });

    const applyElement = (element: TElement) => {
      context.capabilities.updateShapeFromTElement?.(element);
      let parent = node.getParent();
      while (parent instanceof Konva.Group) {
        parent.fire("transform");
        parent = parent.getParent();
      }
    };

    const throttledPatch = throttle((patch: Pick<TElement, "id" | "x" | "y" | "parentGroupId" | "updatedAt">) => {
      context.crdt.patch({ elements: [patch], groups: [] });
    }, 100);

    node.on("dragstart", (event) => {
      if (isCloneDrag || event.evt?.altKey) return;

      originalElement = PenPlugin.toTElement(node);
      multiDragStartPositions.clear();
      passengerOriginalElements.clear();
      const selected = TransformPlugin.filterSelection(context.state.selection);
      selected.forEach((selectedNode) => {
        multiDragStartPositions.set(selectedNode.id(), { ...selectedNode.absolutePosition() });
        if (selectedNode === node) return;

        if (selectedNode instanceof Konva.Shape) {
          const element = context.capabilities.toElement?.(selectedNode);
          if (element) passengerOriginalElements.set(selectedNode.id(), [structuredClone(element)]);
        } else if (selectedNode instanceof Konva.Group) {
          const childElements = (selectedNode.find((child: Konva.Node) => child instanceof Konva.Shape) as Konva.Shape[])
            .map((child) => context.capabilities.toElement?.(child))
            .filter(Boolean) as TElement[];
          passengerOriginalElements.set(selectedNode.id(), structuredClone(childElements));
        }
      });
    });

    node.on("dragmove", () => {
      if (isCloneDrag) return;

      throttledPatch(PenPlugin.toPositionPatch(node));
      const selected = TransformPlugin.filterSelection(context.state.selection);
      if (selected.length <= 1) return;

      const start = multiDragStartPositions.get(node.id());
      if (!start) return;
      const current = node.absolutePosition();
      const dx = current.x - start.x;
      const dy = current.y - start.y;

      selected.forEach((other) => {
        if (other === node) return;
        if (other.isDragging()) return;

        const otherStart = multiDragStartPositions.get(other.id());
        if (!otherStart) return;
        other.absolutePosition({ x: otherStart.x + dx, y: otherStart.y + dy });
      });
    });

    node.on("dragend", () => {
      if (isCloneDrag) {
        isCloneDrag = false;
        originalElement = null;
        multiDragStartPositions.clear();
        passengerOriginalElements.clear();
        return;
      }

      const nextElement = PenPlugin.toTElement(node);
      const beforeElement = originalElement ? structuredClone(originalElement) : null;
      const afterElement = structuredClone(nextElement);

      context.crdt.patch({ elements: [afterElement], groups: [] });

      const selected = TransformPlugin.filterSelection(context.state.selection);
      const passengers = selected.filter((selectedNode) => selectedNode !== node);
      const passengerAfterElements = new Map<string, TElement[]>();
      passengers.forEach((passenger) => {
        if (passenger instanceof Konva.Shape) {
          const element = context.capabilities.toElement?.(passenger);
          if (element) {
            const elements = [structuredClone(element)];
            passengerAfterElements.set(passenger.id(), elements);
            context.crdt.patch({ elements, groups: [] });
          }
        } else if (passenger instanceof Konva.Group) {
          const childElements = (passenger.find((child: Konva.Node) => child instanceof Konva.Shape) as Konva.Shape[])
            .map((child) => context.capabilities.toElement?.(child))
            .filter(Boolean) as TElement[];
          const cloned = structuredClone(childElements);
          passengerAfterElements.set(passenger.id(), cloned);
          if (cloned.length > 0) context.crdt.patch({ elements: cloned, groups: [] });
        }
      });

      if (!beforeElement) return;

      const didMove = beforeElement.x !== afterElement.x || beforeElement.y !== afterElement.y;
      const capturedStartPositions = new Map(multiDragStartPositions);
      const capturedPassengerOriginals = new Map(passengerOriginalElements);
      multiDragStartPositions.clear();
      originalElement = null;
      if (!didMove) return;

      context.history.record({
        label: "drag-pen",
        undo() {
          applyElement(beforeElement);
          context.crdt.patch({ elements: [beforeElement], groups: [] });
          passengers.forEach((passenger) => {
            const startPos = capturedStartPositions.get(passenger.id());
            if (startPos) passenger.absolutePosition(startPos);
            const originalEls = capturedPassengerOriginals.get(passenger.id());
            if (originalEls && originalEls.length > 0) {
              context.crdt.patch({ elements: originalEls, groups: [] });
            }
          });
        },
        redo() {
          applyElement(afterElement);
          context.crdt.patch({ elements: [afterElement], groups: [] });
          passengers.forEach((passenger) => {
            const afterEls = passengerAfterElements.get(passenger.id());
            if (!afterEls || afterEls.length === 0) return;
            if (passenger instanceof Konva.Shape) {
              context.capabilities.updateShapeFromTElement?.(afterEls[0]);
              context.crdt.patch({ elements: afterEls, groups: [] });
            }
          });
        },
      });
    });
  }

  static safeStopDrag(node: Konva.Node) {
    try {
      if (node.isDragging()) {
        node.stopDrag();
      }
    } catch {
      return;
    }
  }

  private static toPositionPatch(node: Konva.Path) {
    const absolutePosition = node.absolutePosition();
    const parent = node.getParent();

    return {
      id: node.id(),
      x: absolutePosition.x,
      y: absolutePosition.y,
      parentGroupId: parent instanceof Konva.Group ? parent.id() : null,
      updatedAt: Date.now(),
    };
  }
}
