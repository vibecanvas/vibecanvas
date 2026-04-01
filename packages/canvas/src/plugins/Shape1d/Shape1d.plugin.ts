import { throttle } from "@solid-primitives/scheduled";
import { createEffect } from "solid-js";
import type { TArrowData, TElement, TElementStyle, TLineData } from "@vibecanvas/shell/automerge/index";
import Konva from "konva";
import type { TTool } from "../../components/FloatingCanvasToolbar/toolbar.types";
import { CustomEvents } from "../../custom-events";
import { CanvasMode } from "../../services/canvas/enum";
import { startSelectionCloneDrag } from "../shared/clone-drag";
import type { IPlugin, IPluginContext } from "../shared/interface";
import { getWorldPosition, setWorldPosition } from "../shared/node-space";
import { getNodeZIndex, setNodeZIndex } from "../shared/render-order.shared";
import { TransformPlugin } from "../Transform/Transform.plugin";

type TShape1dData = TLineData | TArrowData;
type TPoint = [number, number];
type TShape1dNode = Konva.Shape & { getSelfRect(): { x: number; y: number; width: number; height: number } };

const DEFAULT_STROKE = "#0f172a";
const DEFAULT_OPACITY = 0.92;
const DEFAULT_STROKE_WIDTH = 4;
const MIN_HIT_STROKE_WIDTH = 16;
const CURVE_TENSION = 1;
const EDIT_HANDLE_RADIUS = 7;
const INSERT_HANDLE_RADIUS = 6;
const EDIT_HANDLE_STROKE = "#6366f1";
const EDIT_HANDLE_FILL = "#ffffff";

type THandleDragSnapshot = {
  nodeId: string;
  pointIndex: number;
  beforeElement: TElement;
  beforePoints: TPoint[];
  beforeAbsoluteTransform: Konva.Transform;
};

export class Shape1dPlugin implements IPlugin {
  #activeTool: TTool = "select";
  #previewShape: TShape1dNode | null = null;
  #draftElementId: string | null = null;
  #draftStartPoint: TPoint | null = null;
  #draftCurrentPoint: TPoint | null = null;
  #anchorHandles: Konva.Circle[] = [];
  #insertHandles: Konva.Circle[] = [];
  #activeHandleDrag: THandleDragSnapshot | null = null;

  apply(context: IPluginContext): void {
    this.setupToolState(context);
    this.setupDrawFlow(context);
    this.setupEditMode(context);
    Shape1dPlugin.setupCapabilities(context);

    context.hooks.destroy.tap(() => {
      this.resetDraft();
      this.resetPreview();
      this.clearEditHandles(context);
    });
  }

  private setupToolState(context: IPluginContext) {
    context.hooks.customEvent.tap((event, payload) => {
      if (event !== CustomEvents.TOOL_SELECT) return false;

      const nextTool = payload as TTool;
      if (nextTool !== this.#activeTool && this.#previewShape) {
        this.resetDraft();
        this.resetPreview();
      }

      this.#activeTool = nextTool;
      if (!Shape1dPlugin.isSupportedTool(nextTool)) {
        this.resetDraft();
        this.resetPreview();
        this.#draftElementId = null;
      }

      return false;
    });
  }

  private setupDrawFlow(context: IPluginContext) {
    const cancelDraft = () => {
      if (!this.#previewShape && !this.#draftStartPoint) return;

      this.resetDraft();
      this.resetPreview();
      context.setState("mode", CanvasMode.SELECT);
      context.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "select");
    };

    context.hooks.pointerDown.tap(() => {
      if (context.state.mode !== CanvasMode.DRAW_CREATE) return;
      if (!Shape1dPlugin.isSupportedTool(this.#activeTool)) return;

      const pointer = context.dynamicLayer.getRelativePointerPosition();
      if (!pointer) return;

      this.#draftElementId = crypto.randomUUID();
      this.#draftStartPoint = [pointer.x, pointer.y];
      this.#draftCurrentPoint = [pointer.x, pointer.y];
      this.syncPreview(context);
    });

    context.hooks.pointerMove.tap(() => {
      if (context.state.mode !== CanvasMode.DRAW_CREATE) return;
      if (!Shape1dPlugin.isSupportedTool(this.#activeTool)) return;
      if (!this.#draftStartPoint) return;

      const pointer = context.dynamicLayer.getRelativePointerPosition();
      if (!pointer) return;

      this.#draftCurrentPoint = [pointer.x, pointer.y];
      this.syncPreview(context);
    });

    const finalizeDraft = () => {
      if (context.state.mode !== CanvasMode.DRAW_CREATE) return;
      if (!Shape1dPlugin.isSupportedTool(this.#activeTool)) return;

      const element = this.createDraftElement();
      const previewShape = this.#previewShape;

      this.resetDraft();
      this.resetPreview();
      context.setState("mode", CanvasMode.SELECT);
      context.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "select");

      if (!previewShape || !element) return;

      const node = Shape1dPlugin.createShapeFromElement(element);
      Shape1dPlugin.setupShapeListeners(context, node);
      node.setDraggable(true);
      context.staticForegroundLayer.add(node);
      context.capabilities.renderOrder?.assignOrderOnInsert({
        parent: context.staticForegroundLayer,
        nodes: [node],
        position: "front",
      });

      const createdElement = Shape1dPlugin.toTElement(node);
      context.crdt.patch({ elements: [createdElement], groups: [] });
      context.setState("selection", [node]);
      Shape1dPlugin.recordCreateHistory(context, createdElement, node, "create-shape1d");
    };

    context.hooks.keydown.tap((event) => {
      if (event.key !== "Escape") return;
      if (context.state.mode !== CanvasMode.DRAW_CREATE) return;
      if (!Shape1dPlugin.isSupportedTool(this.#activeTool)) return;
      if (!this.#previewShape) return;

      event.preventDefault();
      event.stopPropagation();
      cancelDraft();
    });

    context.hooks.pointerUp.tap(finalizeDraft);
    context.hooks.pointerCancel.tap(cancelDraft);
  }

  private setupEditMode(context: IPluginContext) {
    const refresh = () => {
      const editingId = context.state.editingShape1dId;
      if (!editingId) {
        this.clearEditHandles(context);
        return;
      }

      const node = Shape1dPlugin.findShape1dNodeById(context, editingId);
      const filteredSelection = TransformPlugin.filterSelection(context.state.selection);
      if (!node || filteredSelection.length !== 1 || filteredSelection[0] !== node) {
        this.exitEditMode(context);
        return;
      }

      this.renderEditHandles(context, node);
    };

    context.hooks.customEvent.tap((event, payload) => {
      if (event === CustomEvents.ELEMENT_POINTERDBLCLICK) {
        const target = payload.currentTarget;
        if (!Shape1dPlugin.isShape1dNode(target)) return false;
        const filteredSelection = TransformPlugin.filterSelection(context.state.selection);
        if (filteredSelection.length !== 1 || filteredSelection[0] !== target) return false;

        this.enterEditMode(context, target);
        return true;
      }

      return false;
    });

    context.hooks.pointerDown.tap((event) => {
      if (context.state.mode !== CanvasMode.SELECT) return;
      if (context.state.editingShape1dId === null) return;
      if (event.target === context.stage) {
        this.exitEditMode(context);
      }
    });

    context.hooks.keydown.tap((event) => {
      if (event.key !== "Escape") return;
      if (context.state.editingShape1dId === null) return;

      event.preventDefault();
      event.stopPropagation();
      this.exitEditMode(context);
    });

    context.hooks.cameraChange.tap(refresh);

    createEffect(() => {
      context.state.editingShape1dId;
      context.state.selection;
      refresh();
    });
  }

  private enterEditMode(context: IPluginContext, node: TShape1dNode) {
    if (context.state.editingShape1dId === node.id()) {
      this.renderEditHandles(context, node);
      return;
    }

    this.exitEditMode(context, { preserveSelection: true });
    node.setAttr("vcShape1dPrevDraggable", node.draggable());
    node.draggable(false);
    context.setState("selection", [node]);
    context.setState("editingShape1dId", node.id());
    this.renderEditHandles(context, node);
  }

  private exitEditMode(context: IPluginContext, args?: { preserveSelection?: boolean }) {
    const editingId = context.state.editingShape1dId;
    if (editingId !== null) {
      const node = Shape1dPlugin.findShape1dNodeById(context, editingId);
      if (node) {
        const previousDraggable = node.getAttr("vcShape1dPrevDraggable");
        node.draggable(typeof previousDraggable === "boolean" ? previousDraggable : true);
        node.setAttr("vcShape1dPrevDraggable", undefined);
      }
    }

    this.#activeHandleDrag = null;
    this.clearEditHandles(context);
    context.setState("editingShape1dId", null);
    if (!args?.preserveSelection && context.state.selection.length === 1 && context.state.selection[0]?.id() === editingId) {
      context.setState("selection", []);
    }
  }

  private clearEditHandles(context: IPluginContext) {
    this.#anchorHandles.forEach((handle) => handle.destroy());
    this.#insertHandles.forEach((handle) => handle.destroy());
    this.#anchorHandles = [];
    this.#insertHandles = [];
    context.dynamicLayer.batchDraw();
  }

  private renderEditHandles(context: IPluginContext, node: TShape1dNode) {
    this.clearEditHandles(context);
    const data = Shape1dPlugin.getElementData(node);
    if (!data || data.points.length === 0) return;

    data.points.forEach((point, pointIndex) => {
      const worldPoint = Shape1dPlugin.localPointToWorld(node, point);
      const handle = new Konva.Circle({
        x: worldPoint.x,
        y: worldPoint.y,
        radius: EDIT_HANDLE_RADIUS,
        fill: EDIT_HANDLE_FILL,
        stroke: EDIT_HANDLE_STROKE,
        strokeWidth: 2,
        draggable: true,
      });
      handle.setAttr("vcShape1dHandleKind", "anchor");
      handle.setAttr("vcShape1dPointIndex", pointIndex);
      handle.on("dragstart", () => {
        const editableNode = Shape1dPlugin.findShape1dNodeById(context, node.id());
        if (!editableNode) return;
        this.#activeHandleDrag = {
          nodeId: editableNode.id(),
          pointIndex,
          beforeElement: Shape1dPlugin.toTElement(editableNode),
          beforePoints: structuredClone(Shape1dPlugin.getElementData(editableNode)?.points ?? []),
          beforeAbsoluteTransform: editableNode.getAbsoluteTransform().copy(),
        };
      });
      handle.on("dragmove", () => {
        const drag = this.#activeHandleDrag;
        if (!drag) return;
        const editableNode = Shape1dPlugin.findShape1dNodeById(context, drag.nodeId);
        if (!editableNode) return;
        const pointer = context.dynamicLayer.getRelativePointerPosition();
        if (!pointer) return;

        Shape1dPlugin.applyAnchorDrag(editableNode, drag, { x: pointer.x, y: pointer.y });
        this.refreshEditHandlePositions(context, editableNode);
      });
      handle.on("dragend", () => {
        const drag = this.#activeHandleDrag;
        this.#activeHandleDrag = null;
        if (!drag) return;
        const editableNode = Shape1dPlugin.findShape1dNodeById(context, drag.nodeId);
        if (!editableNode) return;
        const afterElement = Shape1dPlugin.toTElement(editableNode);
        context.crdt.patch({ elements: [afterElement], groups: [] });
        Shape1dPlugin.recordElementHistory(context, drag.beforeElement, afterElement, "edit-shape1d-point");
        this.renderEditHandles(context, editableNode);
      });
      context.dynamicLayer.add(handle);
      this.#anchorHandles.push(handle);
    });

    for (let index = 0; index < data.points.length - 1; index += 1) {
      const insertPoint = Shape1dPlugin.getInsertionPoint(data, index);
      const worldPoint = Shape1dPlugin.localPointToWorld(node, insertPoint);
      const handle = new Konva.Circle({
        x: worldPoint.x,
        y: worldPoint.y,
        radius: INSERT_HANDLE_RADIUS,
        fill: "rgba(255,255,255,0.92)",
        stroke: EDIT_HANDLE_STROKE,
        strokeWidth: 2,
        dash: [2, 2],
        draggable: true,
      });
      handle.setAttr("vcShape1dHandleKind", "insert");
      handle.setAttr("vcShape1dSegmentIndex", index);
      handle.on("dragstart", () => {
        const editableNode = Shape1dPlugin.findShape1dNodeById(context, node.id());
        if (!editableNode) return;
        const beforeElement = Shape1dPlugin.toTElement(editableNode);
        const currentData = Shape1dPlugin.getElementData(editableNode);
        if (!currentData) return;
        const createdPoint = Shape1dPlugin.getInsertionPoint(currentData, index);
        const nextData = structuredClone(currentData);
        nextData.points.splice(index + 1, 0, createdPoint);
        editableNode.setAttr("vcElementData", nextData);
        editableNode.getLayer()?.batchDraw();
        handle.setAttr("vcShape1dHandleKind", "anchor");
        handle.setAttr("vcShape1dPointIndex", index + 1);
        this.#activeHandleDrag = {
          nodeId: editableNode.id(),
          pointIndex: index + 1,
          beforeElement,
          beforePoints: structuredClone(currentData.points),
          beforeAbsoluteTransform: editableNode.getAbsoluteTransform().copy(),
        };
      });
      handle.on("dragmove", () => {
        const drag = this.#activeHandleDrag;
        if (!drag) return;
        const editableNode = Shape1dPlugin.findShape1dNodeById(context, drag.nodeId);
        if (!editableNode) return;
        const pointer = context.dynamicLayer.getRelativePointerPosition();
        if (!pointer) return;

        Shape1dPlugin.applyAnchorDrag(editableNode, drag, { x: pointer.x, y: pointer.y });
        const updatedPoint = Shape1dPlugin.getElementData(editableNode)?.points[drag.pointIndex];
        if (updatedPoint) {
          handle.position(Shape1dPlugin.localPointToWorld(editableNode, updatedPoint));
        }
        context.dynamicLayer.batchDraw();
      });
      handle.on("dragend", () => {
        const drag = this.#activeHandleDrag;
        this.#activeHandleDrag = null;
        if (!drag) return;
        const editableNode = Shape1dPlugin.findShape1dNodeById(context, drag.nodeId);
        if (!editableNode) return;
        const afterElement = Shape1dPlugin.toTElement(editableNode);
        context.crdt.patch({ elements: [afterElement], groups: [] });
        Shape1dPlugin.recordElementHistory(context, drag.beforeElement, afterElement, "insert-shape1d-point");
        this.renderEditHandles(context, editableNode);
      });
      handle.on("pointerclick", (event) => {
        if (this.#activeHandleDrag) return;
        event.cancelBubble = true;
        const editableNode = Shape1dPlugin.findShape1dNodeById(context, node.id());
        if (!editableNode) return;
        const beforeElement = Shape1dPlugin.toTElement(editableNode);
        const currentData = Shape1dPlugin.getElementData(editableNode);
        if (!currentData) return;
        const nextData = structuredClone(currentData);
        nextData.points.splice(index + 1, 0, insertPoint);
        editableNode.setAttr("vcElementData", nextData);
        editableNode.getLayer()?.batchDraw();
        const afterElement = Shape1dPlugin.toTElement(editableNode);
        context.crdt.patch({ elements: [afterElement], groups: [] });
        Shape1dPlugin.recordElementHistory(context, beforeElement, afterElement, "insert-shape1d-point");
        this.renderEditHandles(context, editableNode);
      });
      context.dynamicLayer.add(handle);
      this.#insertHandles.push(handle);
    }

    this.#anchorHandles.forEach((handle) => handle.moveToTop());
    this.#insertHandles.forEach((handle) => handle.moveToTop());
    context.dynamicLayer.batchDraw();
  }

  private refreshEditHandlePositions(context: IPluginContext, node: TShape1dNode) {
    const data = Shape1dPlugin.getElementData(node);
    if (!data) return;

    this.#anchorHandles.forEach((handle, pointIndex) => {
      const point = data.points[pointIndex];
      if (!point) return;
      const worldPoint = Shape1dPlugin.localPointToWorld(node, point);
      handle.position(worldPoint);
    });

    this.#insertHandles.forEach((handle, segmentIndex) => {
      const insertPoint = Shape1dPlugin.getInsertionPoint(data, segmentIndex);
      const worldPoint = Shape1dPlugin.localPointToWorld(node, insertPoint);
      handle.position(worldPoint);
    });

    context.dynamicLayer.batchDraw();
  }

  private syncPreview(context: IPluginContext) {
    const element = this.createDraftElement();
    if (!element) {
      this.resetPreview();
      return;
    }

    const previewShape = this.ensurePreviewShape(context);
    Shape1dPlugin.updateShapeFromElement(previewShape, element);
    previewShape.listening(false);
    previewShape.visible(true);
    previewShape.getLayer()?.batchDraw();
  }

  private ensurePreviewShape(context: IPluginContext) {
    if (this.#previewShape) return this.#previewShape;

    const previewShape = Shape1dPlugin.createShapeFromElement(this.createFallbackPreviewElement());
    previewShape.listening(false);
    previewShape.visible(false);
    previewShape.draggable(false);
    context.dynamicLayer.add(previewShape);
    this.#previewShape = previewShape;
    return previewShape;
  }

  private createFallbackPreviewElement(): TElement {
    return {
      id: this.#draftElementId ?? crypto.randomUUID(),
      x: 0,
      y: 0,
      rotation: 0,
      bindings: [],
      createdAt: Date.now(),
      locked: false,
      parentGroupId: null,
      updatedAt: Date.now(),
      zIndex: "",
      data: {
        type: this.#activeTool === "arrow" ? "arrow" : "line",
        lineType: "straight",
        points: [[0, 0], [0, 0]],
        startBinding: null,
        endBinding: null,
        ...(this.#activeTool === "arrow"
          ? { startCap: "none", endCap: "arrow" }
          : {}),
      } as TShape1dData,
      style: {
        strokeColor: DEFAULT_STROKE,
        opacity: DEFAULT_OPACITY,
        strokeWidth: DEFAULT_STROKE_WIDTH,
      },
    };
  }

  private createDraftElement(): TElement | null {
    if (!this.#draftStartPoint || !this.#draftCurrentPoint) return null;

    const [startX, startY] = this.#draftStartPoint;
    const [endX, endY] = this.#draftCurrentPoint;
    const dx = endX - startX;
    const dy = endY - startY;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return null;

    const now = Date.now();
    const isArrow = this.#activeTool === "arrow";

    return {
      id: this.#draftElementId ?? crypto.randomUUID(),
      x: startX,
      y: startY,
      rotation: 0,
      bindings: [],
      createdAt: now,
      locked: false,
      parentGroupId: null,
      updatedAt: now,
      zIndex: "",
      data: isArrow
        ? {
            type: "arrow",
            lineType: "straight",
            points: [[0, 0], [dx, dy]],
            startBinding: null,
            endBinding: null,
            startCap: "none",
            endCap: "arrow",
          }
        : {
            type: "line",
            lineType: "straight",
            points: [[0, 0], [dx, dy]],
            startBinding: null,
            endBinding: null,
          },
      style: {
        strokeColor: DEFAULT_STROKE,
        opacity: DEFAULT_OPACITY,
        strokeWidth: DEFAULT_STROKE_WIDTH,
      },
    };
  }

  private resetDraft() {
    this.#draftElementId = null;
    this.#draftStartPoint = null;
    this.#draftCurrentPoint = null;
  }

  private resetPreview() {
    if (!this.#previewShape) return;

    this.#previewShape.destroy();
    this.#previewShape = null;
  }

  private static setupCapabilities(context: IPluginContext) {
    const previousCreate = context.capabilities.createShapeFromTElement;
    context.capabilities.createShapeFromTElement = (element) => {
      if (!Shape1dPlugin.isSupportedElementType(element.data.type)) {
        return previousCreate?.(element) ?? null;
      }

      const node = Shape1dPlugin.createShapeFromElement(element);
      Shape1dPlugin.setupShapeListeners(context, node);
      node.draggable(true);
      return node;
    };

    const previousToElement = context.capabilities.toElement;
    context.capabilities.toElement = (node) => {
      if (Shape1dPlugin.isShape1dNode(node)) {
        return Shape1dPlugin.toTElement(node);
      }

      return previousToElement?.(node) ?? null;
    };

    const previousUpdate = context.capabilities.updateShapeFromTElement;
    context.capabilities.updateShapeFromTElement = (element) => {
      if (!Shape1dPlugin.isSupportedElementType(element.data.type)) {
        return previousUpdate?.(element) ?? null;
      }

      const node = context.staticForegroundLayer.findOne((candidate: Konva.Node) => {
        return Shape1dPlugin.isShape1dNode(candidate) && candidate.id() === element.id;
      });

      if (!Shape1dPlugin.isShape1dNode(node)) return null;

      Shape1dPlugin.updateShapeFromElement(node, element);
      return node;
    };
  }

  static isSupportedTool(tool: TTool) {
    return tool === "line" || tool === "arrow";
  }

  static isSupportedElementType(type: TShape1dData["type"] | string): type is TShape1dData["type"] {
    return type === "line" || type === "arrow";
  }

  static findShape1dNodeById(context: IPluginContext, id: string) {
    const candidate = context.staticForegroundLayer.findOne((node: Konva.Node) => {
      return Shape1dPlugin.isShape1dNode(node) && node.id() === id;
    });

    return Shape1dPlugin.isShape1dNode(candidate) ? candidate : null;
  }

  static getElementData(node: TShape1dNode) {
    const data = node.getAttr("vcElementData") as TShape1dData | undefined;
    return data ? structuredClone(data) : null;
  }

  private static getLayerAbsoluteTransform(node: Konva.Node) {
    return node.getLayer()?.getAbsoluteTransform().copy() ?? null;
  }

  static worldPointToLocal(node: TShape1dNode, point: { x: number; y: number }) {
    const layerTransform = Shape1dPlugin.getLayerAbsoluteTransform(node);
    const absolutePoint = layerTransform ? layerTransform.point(point) : point;
    return node.getAbsoluteTransform().copy().invert().point(absolutePoint);
  }

  static localPointToWorld(node: TShape1dNode, point: TPoint | { x: number; y: number }) {
    const resolvedPoint = Array.isArray(point)
      ? { x: point[0], y: point[1] }
      : point;
    const absolutePoint = node.getAbsoluteTransform().point(resolvedPoint);
    const layerTransform = Shape1dPlugin.getLayerAbsoluteTransform(node);
    if (!layerTransform) return absolutePoint;

    return layerTransform.invert().point(absolutePoint);
  }

  private static absolutePointToLocal(transform: Konva.Transform, point: { x: number; y: number }) {
    return transform.copy().invert().point(point);
  }

  private static getCurveControlPoints(points: TPoint[], index: number) {
    const p0 = points[index - 1] ?? points[index]!;
    const p1 = points[index]!;
    const p2 = points[index + 1]!;
    const p3 = points[index + 2] ?? p2;
    const cp1: TPoint = [
      p1[0] + ((p2[0] - p0[0]) / 6) * CURVE_TENSION,
      p1[1] + ((p2[1] - p0[1]) / 6) * CURVE_TENSION,
    ];
    const cp2: TPoint = [
      p2[0] - ((p3[0] - p1[0]) / 6) * CURVE_TENSION,
      p2[1] - ((p3[1] - p1[1]) / 6) * CURVE_TENSION,
    ];

    return { p1, cp1, cp2, p2 };
  }

  private static evaluateCubicPoint(
    p1: TPoint,
    cp1: TPoint,
    cp2: TPoint,
    p2: TPoint,
    t: number,
  ): TPoint {
    const mt = 1 - t;
    const x = mt ** 3 * p1[0] + 3 * mt ** 2 * t * cp1[0] + 3 * mt * t ** 2 * cp2[0] + t ** 3 * p2[0];
    const y = mt ** 3 * p1[1] + 3 * mt ** 2 * t * cp1[1] + 3 * mt * t ** 2 * cp2[1] + t ** 3 * p2[1];
    return [x, y];
  }

  static getInsertionPoint(data: TShape1dData, segmentIndex: number): TPoint {
    const p1 = data.points[segmentIndex];
    const p2 = data.points[segmentIndex + 1];
    if (!p1 || !p2) return [0, 0];

    if (data.lineType === "curved" && data.points.length > 2) {
      const { p1: start, cp1, cp2, p2: end } = Shape1dPlugin.getCurveControlPoints(data.points, segmentIndex);
      return Shape1dPlugin.evaluateCubicPoint(start, cp1, cp2, end, 0.5);
    }

    return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
  }

  static applyAnchorDrag(node: TShape1dNode, drag: THandleDragSnapshot, worldPoint: { x: number; y: number }) {
    const data = Shape1dPlugin.getElementData(node);
    if (!data) return;
    const nextData = structuredClone(data);

    if (drag.pointIndex === 0) {
      setWorldPosition(node, worldPoint);
      nextData.points = drag.beforePoints.map((point, index) => {
        if (index === 0) return [0, 0];
        const absolutePoint = drag.beforeAbsoluteTransform.point({ x: point[0], y: point[1] });
        const nextLocal = Shape1dPlugin.absolutePointToLocal(node.getAbsoluteTransform(), absolutePoint);
        return [nextLocal.x, nextLocal.y] as TPoint;
      });
    } else {
      const nextLocal = Shape1dPlugin.worldPointToLocal(node, worldPoint);
      nextData.points[drag.pointIndex] = [nextLocal.x, nextLocal.y];
    }

    node.setAttr("vcElementData", nextData);
    node.getLayer()?.batchDraw();
  }

  static recordElementHistory(context: IPluginContext, beforeElement: TElement, afterElement: TElement, label: string) {
    if (JSON.stringify(beforeElement) === JSON.stringify(afterElement)) return;

    context.history.record({
      label,
      undo() {
        context.capabilities.updateShapeFromTElement?.(beforeElement);
        context.crdt.patch({ elements: [beforeElement], groups: [] });
      },
      redo() {
        context.capabilities.updateShapeFromTElement?.(afterElement);
        context.crdt.patch({ elements: [afterElement], groups: [] });
      },
    });
  }

  private static createNode(config?: Konva.ShapeConfig) {
    const node = new Konva.Shape({
      perfectDrawEnabled: false,
      lineCap: "round",
      lineJoin: "round",
      ...config,
      sceneFunc(context, shape) {
        Shape1dPlugin.drawScene(context, shape as TShape1dNode);
      },
    }) as TShape1dNode;

    node.getSelfRect = () => Shape1dPlugin.getSelfRect(node);
    return node;
  }

  private static drawScene(context: Konva.Context, node: TShape1dNode) {
    const data = node.getAttr("vcElementData") as TShape1dData | undefined;
    if (!data || data.points.length < 2) return;

    context.beginPath();
    Shape1dPlugin.traceLinePath(context, data);
    context.strokeShape(node);

    if (data.type === "arrow") {
      const strokeWidth = node.strokeWidth();
      context.beginPath();
      Shape1dPlugin.traceCapPath(context, data, "start", strokeWidth);
      Shape1dPlugin.traceCapPath(context, data, "end", strokeWidth);
      context.fillStrokeShape(node);
    }
  }

  private static getSelfRect(node: TShape1dNode) {
    const data = node.getAttr("vcElementData") as TShape1dData | undefined;
    const strokeWidth = Shape1dPlugin.getStrokeWidthFromStyle(
      (node.getAttr("vcElementStyle") as TElementStyle | undefined) ?? {},
    );

    if (!data || data.points.length === 0) {
      return { x: -strokeWidth, y: -strokeWidth, width: strokeWidth * 2, height: strokeWidth * 2 };
    }

    const xs = data.points.map((point) => point[0]);
    const ys = data.points.map((point) => point[1]);
    const pad = Shape1dPlugin.getBoundsPadding(data, strokeWidth);
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    const maxX = Math.max(...xs) + pad;
    const maxY = Math.max(...ys) + pad;

    return {
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    };
  }

  private static getBoundsPadding(data: TShape1dData, strokeWidth: number) {
    const base = Math.max(strokeWidth * 1.5, 8);
    if (data.type !== "arrow") return base;

    return Math.max(base, strokeWidth * 4.5, 18);
  }

  private static traceLinePath(context: Konva.Context, data: TShape1dData) {
    const points = data.points;
    const [firstX, firstY] = points[0] ?? [0, 0];
    context.moveTo(firstX, firstY);

    if (data.lineType === "curved" && points.length > 2) {
      Shape1dPlugin.traceCurvedSegments(context, points);
      return;
    }

    for (let index = 1; index < points.length; index += 1) {
      const point = points[index];
      if (!point) continue;
      context.lineTo(point[0], point[1]);
    }
  }

  private static traceCurvedSegments(context: Konva.Context, points: TPoint[]) {
    for (let index = 0; index < points.length - 1; index += 1) {
      const p0 = points[index - 1] ?? points[index]!;
      const p1 = points[index]!;
      const p2 = points[index + 1]!;
      const p3 = points[index + 2] ?? p2;
      const cp1: TPoint = [
        p1[0] + ((p2[0] - p0[0]) / 6) * CURVE_TENSION,
        p1[1] + ((p2[1] - p0[1]) / 6) * CURVE_TENSION,
      ];
      const cp2: TPoint = [
        p2[0] - ((p3[0] - p1[0]) / 6) * CURVE_TENSION,
        p2[1] - ((p3[1] - p1[1]) / 6) * CURVE_TENSION,
      ];
      context.bezierCurveTo(cp1[0], cp1[1], cp2[0], cp2[1], p2[0], p2[1]);
    }
  }

  private static traceCapPath(
    context: Konva.Context,
    data: TArrowData,
    edge: "start" | "end",
    strokeWidth: number,
  ) {
    const capType = edge === "start" ? data.startCap : data.endCap;
    if (capType === "none") return;

    const points = data.points;
    const anchor = edge === "start" ? points[0] : points[points.length - 1];
    const adjacent = edge === "start" ? points[1] : points[points.length - 2];
    if (!anchor || !adjacent) return;

    const dx = anchor[0] - adjacent[0];
    const dy = anchor[1] - adjacent[1];
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const px = -uy;
    const py = ux;
    const capLength = Math.max(12, strokeWidth * 4);
    const capWidth = Math.max(8, strokeWidth * 2.5);
    const tipX = anchor[0];
    const tipY = anchor[1];
    const baseX = tipX - ux * capLength;
    const baseY = tipY - uy * capLength;

    if (capType === "dot") {
      const radius = Math.max(4, strokeWidth * 1.6);
      context.moveTo(tipX + radius, tipY);
      context.arc(tipX, tipY, radius, 0, Math.PI * 2);
      return;
    }

    if (capType === "arrow") {
      context.moveTo(tipX, tipY);
      context.lineTo(baseX + px * (capWidth / 2), baseY + py * (capWidth / 2));
      context.lineTo(baseX - px * (capWidth / 2), baseY - py * (capWidth / 2));
      context.closePath();
      return;
    }

    const middleX = tipX - ux * (capLength / 2);
    const middleY = tipY - uy * (capLength / 2);
    context.moveTo(tipX, tipY);
    context.lineTo(middleX + px * (capWidth / 2), middleY + py * (capWidth / 2));
    context.lineTo(baseX, baseY);
    context.lineTo(middleX - px * (capWidth / 2), middleY - py * (capWidth / 2));
    context.closePath();
  }

  private static getStrokeWidthFromStyle(style: TElementStyle) {
    return style.strokeWidth ?? DEFAULT_STROKE_WIDTH;
  }

  private static getStrokeColorFromStyle(style: TElementStyle) {
    return style.strokeColor ?? style.backgroundColor ?? DEFAULT_STROKE;
  }

  private static getColorStyleKey(style: TElementStyle): "backgroundColor" | "strokeColor" {
    if (typeof style.backgroundColor === "string" && typeof style.strokeColor !== "string") {
      return "backgroundColor";
    }

    return "strokeColor";
  }

  static isShape1dNode(node: Konva.Node | null | undefined): node is TShape1dNode {
    if (!(node instanceof Konva.Shape)) return false;
    const data = node.getAttr("vcElementData") as TShape1dData | undefined;
    return !!data && Shape1dPlugin.isSupportedElementType(data.type);
  }

  static hasRenderableRuntime(node: Konva.Node | null | undefined): node is TShape1dNode {
    return Shape1dPlugin.isShape1dNode(node)
      && Object.hasOwn(node, "getSelfRect")
      && typeof node.sceneFunc?.() === "function";
  }

  static createShapeFromElement(element: TElement) {
    if (!Shape1dPlugin.isSupportedElementType(element.data.type)) {
      throw new Error("Unsupported element type for Shape1dPlugin");
    }

    const node = Shape1dPlugin.createNode({
      id: element.id,
      x: element.x,
      y: element.y,
      rotation: element.rotation,
      stroke: Shape1dPlugin.getStrokeColorFromStyle(element.style),
      fill: Shape1dPlugin.getStrokeColorFromStyle(element.style),
      strokeWidth: Shape1dPlugin.getStrokeWidthFromStyle(element.style),
      hitStrokeWidth: Math.max(MIN_HIT_STROKE_WIDTH, Shape1dPlugin.getStrokeWidthFromStyle(element.style) + 8),
      opacity: element.style.opacity ?? DEFAULT_OPACITY,
      draggable: false,
      listening: true,
    });

    node.setAttr("vcElementData", structuredClone(element.data));
    node.setAttr("vcElementStyle", structuredClone(element.style));
    setNodeZIndex(node, element.zIndex);
    return node;
  }

  static updateShapeFromElement(node: TShape1dNode, element: TElement) {
    if (!Shape1dPlugin.isSupportedElementType(element.data.type)) return;

    setWorldPosition(node, { x: element.x, y: element.y });
    node.rotation(element.rotation);
    node.stroke(Shape1dPlugin.getStrokeColorFromStyle(element.style));
    node.fill(Shape1dPlugin.getStrokeColorFromStyle(element.style));
    node.strokeWidth(Shape1dPlugin.getStrokeWidthFromStyle(element.style));
    node.hitStrokeWidth(Math.max(MIN_HIT_STROKE_WIDTH, Shape1dPlugin.getStrokeWidthFromStyle(element.style) + 8));
    node.opacity(element.style.opacity ?? DEFAULT_OPACITY);
    node.scale({ x: 1, y: 1 });
    node.setAttr("vcElementData", structuredClone(element.data));
    node.setAttr("vcElementStyle", structuredClone(element.style));
    setNodeZIndex(node, element.zIndex);
  }

  private static createStyleFromNode(node: TShape1dNode, baseStyle: TElementStyle): TElementStyle {
    const style: TElementStyle = {
      ...structuredClone(baseStyle),
      opacity: node.opacity(),
      strokeWidth: node.strokeWidth(),
    };

    const colorStyleKey = Shape1dPlugin.getColorStyleKey(baseStyle);
    delete style.backgroundColor;
    delete style.strokeColor;
    style[colorStyleKey] = typeof node.stroke() === "string" ? node.stroke() : DEFAULT_STROKE;

    return style;
  }

  static toTElement(node: TShape1dNode): TElement {
    const baseData = structuredClone(node.getAttr("vcElementData") as TShape1dData | undefined);
    if (!baseData || !Shape1dPlugin.isSupportedElementType(baseData.type)) {
      throw new Error("Shape1d node is missing vcElementData metadata");
    }

    const baseStyle = structuredClone((node.getAttr("vcElementStyle") as TElementStyle | undefined) ?? {});
    const absoluteScale = node.getAbsoluteScale();
    const layer = node.getLayer();
    const layerScaleX = layer?.scaleX() ?? 1;
    const layerScaleY = layer?.scaleY() ?? 1;
    const scaleX = absoluteScale.x / layerScaleX;
    const scaleY = absoluteScale.y / layerScaleY;
    const { x, y } = getWorldPosition(node);
    const parent = node.getParent();
    const parentGroupId = parent instanceof Konva.Group ? parent.id() : null;

    return {
      id: node.id(),
      x,
      y,
      rotation: node.getAbsoluteRotation(),
      bindings: [],
      createdAt: Date.now(),
      locked: false,
      parentGroupId,
      updatedAt: Date.now(),
      zIndex: getNodeZIndex(node),
      data: {
        ...baseData,
        points: baseData.points.map(([px, py]) => [px * scaleX, py * scaleY] as TPoint),
      },
      style: Shape1dPlugin.createStyleFromNode(node, baseStyle),
    };
  }

  static createPreviewClone(node: TShape1dNode) {
    const element = Shape1dPlugin.toTElement(node);
    const clone = Shape1dPlugin.createShapeFromElement({
      ...element,
      id: crypto.randomUUID(),
      parentGroupId: null,
      data: structuredClone(element.data),
      style: structuredClone(element.style),
    });
    clone.setDraggable(true);
    return clone;
  }

  static createCloneDrag(context: IPluginContext, node: TShape1dNode) {
    const previewClone = Shape1dPlugin.createPreviewClone(node);
    context.dynamicLayer.add(previewClone);
    previewClone.startDrag();

    const finalizeCloneDrag = () => {
      previewClone.off("dragend", finalizeCloneDrag);
      const cloned = Shape1dPlugin.finalizePreviewClone(context, previewClone);
      context.setState("selection", cloned ? [cloned] : []);
    };

    previewClone.on("dragend", finalizeCloneDrag);
    return previewClone;
  }

static finalizePreviewClone(context: IPluginContext, previewClone: TShape1dNode) {
    if (previewClone.isDragging()) {
      previewClone.stopDrag();
    }

    previewClone.moveTo(context.staticForegroundLayer)
    Shape1dPlugin.setupShapeListeners(context, previewClone);
    previewClone.setDraggable(true);
    context.capabilities.renderOrder?.assignOrderOnInsert({
      parent: context.staticForegroundLayer,
      nodes: [previewClone],
      position: "front",
    });

    const createdElement = Shape1dPlugin.toTElement(previewClone);
    context.crdt.patch({ elements: [createdElement], groups: [] });
    Shape1dPlugin.recordCreateHistory(context, createdElement, previewClone, "clone-shape1d");
    return previewClone;
  }

  static setupShapeListeners(context: IPluginContext, node: TShape1dNode) {
    let originalElement: TElement | null = null;
    let isCloneDrag = false;
    const multiDragStartPositions = new Map<string, { x: number; y: number }>();
    const passengerOriginalElements = new Map<string, TElement[]>();

    node.off("pointerclick pointerdown dragstart pointerdblclick dragmove dragend");

    node.on("pointerclick", (event) => {
      if (context.state.mode !== CanvasMode.SELECT) return;
      context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERCLICK, event);
    });

    node.on("pointerdown dragstart", (event) => {
      if (context.state.mode !== CanvasMode.SELECT) {
        Shape1dPlugin.safeStopDrag(node);
        return;
      }

      if (context.state.editingShape1dId === node.id()) {
        Shape1dPlugin.safeStopDrag(node);
        return;
      }

      if (event.type === "pointerdown") {
        const earlyExit = context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERDOWN, event);
        if (earlyExit) event.cancelBubble = true;
      }

      if (event.type === "dragstart" && event.evt?.altKey) {
        isCloneDrag = true;
        Shape1dPlugin.safeStopDrag(node);
        if (startSelectionCloneDrag(context, node)) {
          isCloneDrag = false;
          return;
        }
        Shape1dPlugin.createCloneDrag(context, node);
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

      originalElement = Shape1dPlugin.toTElement(node);
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

      throttledPatch(Shape1dPlugin.toPositionPatch(node));
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

      const nextElement = Shape1dPlugin.toTElement(node);
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
        label: "drag-shape1d",
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

  private static recordCreateHistory(context: IPluginContext, element: TElement, node: TShape1dNode, label: string) {
    const snapshot = structuredClone(element);
    context.history.record({
      label,
      undo() {
        const currentNode = context.staticForegroundLayer.findOne((candidate: Konva.Node) => {
          return Shape1dPlugin.isShape1dNode(candidate) && candidate.id() === snapshot.id;
        });
        currentNode?.destroy();
        context.crdt.deleteById({ elementIds: [snapshot.id] });
        context.setState("selection", context.state.selection.filter((candidate) => candidate.id() !== snapshot.id));
      },
      redo() {
        let currentNode = context.staticForegroundLayer.findOne((candidate: Konva.Node) => {
          return Shape1dPlugin.isShape1dNode(candidate) && candidate.id() === snapshot.id;
        });
        if (!Shape1dPlugin.isShape1dNode(currentNode)) {
          currentNode = Shape1dPlugin.createShapeFromElement(snapshot);
          Shape1dPlugin.setupShapeListeners(context, currentNode);
          currentNode.setDraggable(true);
          context.staticForegroundLayer.add(currentNode);
        }

        context.capabilities.updateShapeFromTElement?.(snapshot);
        context.crdt.patch({ elements: [snapshot], groups: [] });
        if (Shape1dPlugin.isShape1dNode(currentNode)) {
          context.setState("selection", [currentNode]);
        }
      },
    });

    context.setState("selection", [node]);
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

  private static toPositionPatch(node: TShape1dNode) {
    const worldPosition = getWorldPosition(node);
    const parent = node.getParent();

    return {
      id: node.id(),
      x: worldPosition.x,
      y: worldPosition.y,
      parentGroupId: parent instanceof Konva.Group ? parent.id() : null,
      updatedAt: Date.now(),
    };
  }
}
