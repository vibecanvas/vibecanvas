import { createEffect } from "solid-js";
import type { TElement } from "@vibecanvas/automerge-service/types/canvas-doc";
import Konva from "konva";
import type { TTool } from "../../components/FloatingCanvasToolbar/toolbar.types";
import { CustomEvents } from "../../custom-events";
import { CanvasMode } from "../../services/canvas/enum";
import type { IPlugin, IPluginContext } from "../shared/interface";
import { TransformPlugin } from "../Transform/Transform.plugin";
import { createDraftElement, createFallbackPreviewElement } from "./Shape1d.draft";
import { createPreviewClone, safeStopDrag, toTElement, updateShapeFromElement } from "./Shape1d.element";
import { applyAnchorDrag, getInsertionPoint, localPointToWorld, worldPointToLocal } from "./Shape1d.geometry";
import { recordCreateHistory, recordElementHistory } from "./Shape1d.history";
import { createShapeFromElement } from "./Shape1d.render";
import { createCloneDrag, finalizePreviewClone, setupCapabilities, setupShapeListeners } from "./Shape1d.runtime";
import { DEFAULT_OPACITY, EDIT_HANDLE_FILL, EDIT_HANDLE_RADIUS, EDIT_HANDLE_STROKE, INSERT_HANDLE_RADIUS, type THandleDragSnapshot, type TPoint, type TShape1dData, type TShape1dNode, findShape1dNodeById, getElementData, hasRenderableRuntime, isShape1dNode, isSupportedElementType, isSupportedTool } from "./Shape1d.shared";

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
    setupCapabilities(context);
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
      if (!isSupportedTool(nextTool)) {
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
      if (context.state.mode !== CanvasMode.DRAW_CREATE || !isSupportedTool(this.#activeTool)) return;
      const pointer = context.dynamicLayer.getRelativePointerPosition();
      if (!pointer) return;
      this.#draftElementId = crypto.randomUUID();
      this.#draftStartPoint = [pointer.x, pointer.y];
      this.#draftCurrentPoint = [pointer.x, pointer.y];
      this.syncPreview(context);
    });
    context.hooks.pointerMove.tap(() => {
      if (context.state.mode !== CanvasMode.DRAW_CREATE || !isSupportedTool(this.#activeTool) || !this.#draftStartPoint) return;
      const pointer = context.dynamicLayer.getRelativePointerPosition();
      if (!pointer) return;
      this.#draftCurrentPoint = [pointer.x, pointer.y];
      this.syncPreview(context);
    });
    const finalizeDraft = () => {
      if (context.state.mode !== CanvasMode.DRAW_CREATE || !isSupportedTool(this.#activeTool)) return;
      const element = this.createDraftElement();
      const previewShape = this.#previewShape;
      this.resetDraft();
      this.resetPreview();
      context.setState("mode", CanvasMode.SELECT);
      context.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "select");
      if (!previewShape || !element) return;
      const node = createShapeFromElement(element);
      setupShapeListeners(context, node);
      node.setDraggable(true);
      context.staticForegroundLayer.add(node);
      context.capabilities.renderOrder?.assignOrderOnInsert({ parent: context.staticForegroundLayer, nodes: [node], position: "front" });
      const createdElement = toTElement(node);
      context.crdt.patch({ elements: [createdElement], groups: [] });
      context.setState("selection", [node]);
      recordCreateHistory({ context, setupShapeListeners }, { element: createdElement, node, label: "create-shape1d" });
    };
    context.hooks.keydown.tap((event) => {
      if (event.key !== "Escape" || context.state.mode !== CanvasMode.DRAW_CREATE || !isSupportedTool(this.#activeTool) || !this.#previewShape) return;
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
      if (!editingId) return this.clearEditHandles(context);
      const node = findShape1dNodeById(context, editingId);
      const filteredSelection = TransformPlugin.filterSelection(context.state.selection);
      if (!node || filteredSelection.length !== 1 || filteredSelection[0] !== node) return this.exitEditMode(context);
      this.renderEditHandles(context, node);
    };
    context.hooks.customEvent.tap((event, payload) => {
      if (event !== CustomEvents.ELEMENT_POINTERDBLCLICK) return false;
      const target = payload.currentTarget;
      const filteredSelection = TransformPlugin.filterSelection(context.state.selection);
      if (!isShape1dNode(target) || filteredSelection.length !== 1 || filteredSelection[0] !== target) return false;
      this.enterEditMode(context, target);
      return true;
    });
    context.hooks.pointerDown.tap((event) => {
      if (context.state.mode === CanvasMode.SELECT && context.state.editingShape1dId !== null && event.target === context.stage) this.exitEditMode(context);
    });
    context.hooks.keydown.tap((event) => {
      if (event.key !== "Escape" || context.state.editingShape1dId === null) return;
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
    if (context.state.editingShape1dId === node.id()) return this.renderEditHandles(context, node);
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
      const node = findShape1dNodeById(context, editingId);
      if (node) {
        const previousDraggable = node.getAttr("vcShape1dPrevDraggable");
        node.draggable(typeof previousDraggable === "boolean" ? previousDraggable : true);
        node.setAttr("vcShape1dPrevDraggable", undefined);
      }
    }
    this.#activeHandleDrag = null;
    this.clearEditHandles(context);
    context.setState("editingShape1dId", null);
    if (!args?.preserveSelection && context.state.selection.length === 1 && context.state.selection[0]?.id() === editingId) context.setState("selection", []);
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
    const data = getElementData(node);
    if (!data || data.points.length === 0) return;
    data.points.forEach((point, pointIndex) => {
      const worldPoint = localPointToWorld(node, point);
      const handle = new Konva.Circle({ x: worldPoint.x, y: worldPoint.y, radius: EDIT_HANDLE_RADIUS, fill: EDIT_HANDLE_FILL, stroke: EDIT_HANDLE_STROKE, strokeWidth: 2, draggable: true });
      handle.setAttr("vcShape1dHandleKind", "anchor");
      handle.setAttr("vcShape1dPointIndex", pointIndex);
      handle.on("dragstart", () => {
        const editableNode = findShape1dNodeById(context, node.id());
        if (!editableNode) return;
        this.#activeHandleDrag = { nodeId: editableNode.id(), pointIndex, beforeElement: toTElement(editableNode), beforePoints: structuredClone(getElementData(editableNode)?.points ?? []), beforeAbsoluteTransform: editableNode.getAbsoluteTransform().copy() };
      });
      handle.on("dragmove", () => {
        const drag = this.#activeHandleDrag;
        if (!drag) return;
        const editableNode = findShape1dNodeById(context, drag.nodeId);
        const pointer = context.dynamicLayer.getRelativePointerPosition();
        if (!editableNode || !pointer) return;
        applyAnchorDrag(editableNode, drag, { x: pointer.x, y: pointer.y });
        this.refreshEditHandlePositions(context, editableNode);
      });
      handle.on("dragend", () => {
        const drag = this.#activeHandleDrag;
        this.#activeHandleDrag = null;
        if (!drag) return;
        const editableNode = findShape1dNodeById(context, drag.nodeId);
        if (!editableNode) return;
        const afterElement = toTElement(editableNode);
        context.crdt.patch({ elements: [afterElement], groups: [] });
        recordElementHistory({ context }, { beforeElement: drag.beforeElement, afterElement, label: "edit-shape1d-point" });
        this.renderEditHandles(context, editableNode);
      });
      context.dynamicLayer.add(handle);
      this.#anchorHandles.push(handle);
    });
    for (let index = 0; index < data.points.length - 1; index += 1) {
      const insertPoint = getInsertionPoint(data, index);
      const worldPoint = localPointToWorld(node, insertPoint);
      const handle = new Konva.Circle({ x: worldPoint.x, y: worldPoint.y, radius: INSERT_HANDLE_RADIUS, fill: "rgba(255,255,255,0.92)", stroke: EDIT_HANDLE_STROKE, strokeWidth: 2, dash: [2, 2], draggable: true });
      handle.setAttr("vcShape1dHandleKind", "insert");
      handle.setAttr("vcShape1dSegmentIndex", index);
      handle.on("dragstart", () => {
        const editableNode = findShape1dNodeById(context, node.id());
        if (!editableNode) return;
        const beforeElement = toTElement(editableNode);
        const currentData = getElementData(editableNode);
        if (!currentData) return;
        const createdPoint = getInsertionPoint(currentData, index);
        const nextData = structuredClone(currentData);
        nextData.points.splice(index + 1, 0, createdPoint);
        editableNode.setAttr("vcElementData", nextData);
        editableNode.getLayer()?.batchDraw();
        handle.setAttr("vcShape1dHandleKind", "anchor");
        handle.setAttr("vcShape1dPointIndex", index + 1);
        this.#activeHandleDrag = { nodeId: editableNode.id(), pointIndex: index + 1, beforeElement, beforePoints: structuredClone(currentData.points), beforeAbsoluteTransform: editableNode.getAbsoluteTransform().copy() };
      });
      handle.on("dragmove", () => {
        const drag = this.#activeHandleDrag;
        if (!drag) return;
        const editableNode = findShape1dNodeById(context, drag.nodeId);
        const pointer = context.dynamicLayer.getRelativePointerPosition();
        if (!editableNode || !pointer) return;
        applyAnchorDrag(editableNode, drag, { x: pointer.x, y: pointer.y });
        const updatedPoint = getElementData(editableNode)?.points[drag.pointIndex];
        if (updatedPoint) handle.position(localPointToWorld(editableNode, updatedPoint));
        context.dynamicLayer.batchDraw();
      });
      handle.on("dragend", () => {
        const drag = this.#activeHandleDrag;
        this.#activeHandleDrag = null;
        if (!drag) return;
        const editableNode = findShape1dNodeById(context, drag.nodeId);
        if (!editableNode) return;
        const afterElement = toTElement(editableNode);
        context.crdt.patch({ elements: [afterElement], groups: [] });
        recordElementHistory({ context }, { beforeElement: drag.beforeElement, afterElement, label: "insert-shape1d-point" });
        this.renderEditHandles(context, editableNode);
      });
      handle.on("pointerclick", (event) => {
        if (this.#activeHandleDrag) return;
        event.cancelBubble = true;
        const editableNode = findShape1dNodeById(context, node.id());
        const currentData = editableNode ? getElementData(editableNode) : null;
        if (!editableNode || !currentData) return;
        const beforeElement = toTElement(editableNode);
        const nextData = structuredClone(currentData);
        nextData.points.splice(index + 1, 0, insertPoint);
        editableNode.setAttr("vcElementData", nextData);
        editableNode.getLayer()?.batchDraw();
        const afterElement = toTElement(editableNode);
        context.crdt.patch({ elements: [afterElement], groups: [] });
        recordElementHistory({ context }, { beforeElement, afterElement, label: "insert-shape1d-point" });
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
    const data = getElementData(node);
    if (!data) return;
    this.#anchorHandles.forEach((handle, pointIndex) => {
      const point = data.points[pointIndex];
      if (point) handle.position(localPointToWorld(node, point));
    });
    this.#insertHandles.forEach((handle, segmentIndex) => handle.position(localPointToWorld(node, getInsertionPoint(data, segmentIndex))));
    context.dynamicLayer.batchDraw();
  }

  private syncPreview(context: IPluginContext) {
    const element = this.createDraftElement();
    if (!element) return this.resetPreview();
    const previewShape = this.ensurePreviewShape(context);
    updateShapeFromElement(previewShape, element);
    previewShape.listening(false);
    previewShape.visible(true);
    previewShape.getLayer()?.batchDraw();
  }

  private ensurePreviewShape(context: IPluginContext) {
    if (this.#previewShape) return this.#previewShape;
    const previewShape = createShapeFromElement(this.createFallbackPreviewElement());
    previewShape.listening(false);
    previewShape.visible(false);
    previewShape.draggable(false);
    context.dynamicLayer.add(previewShape);
    this.#previewShape = previewShape;
    return previewShape;
  }

  private createFallbackPreviewElement(): TElement {
    return createFallbackPreviewElement({ activeTool: this.#activeTool === "arrow" ? "arrow" : "line", draftElementId: this.#draftElementId });
  }

  private createDraftElement(): TElement | null {
    return isSupportedTool(this.#activeTool) ? createDraftElement({ activeTool: this.#activeTool, draftElementId: this.#draftElementId, draftStartPoint: this.#draftStartPoint, draftCurrentPoint: this.#draftCurrentPoint }) : null;
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

  static isSupportedTool = isSupportedTool;
  static isSupportedElementType = isSupportedElementType;
  static findShape1dNodeById = findShape1dNodeById;
  static getElementData = getElementData;
  static worldPointToLocal = worldPointToLocal;
  static localPointToWorld = localPointToWorld;
  static getInsertionPoint = getInsertionPoint;
  static applyAnchorDrag = applyAnchorDrag;
  static recordElementHistory(context: IPluginContext, beforeElement: TElement, afterElement: TElement, label: string) { return recordElementHistory({ context }, { beforeElement, afterElement, label }); }
  static isShape1dNode = isShape1dNode;
  static hasRenderableRuntime = hasRenderableRuntime;
  static createShapeFromElement = createShapeFromElement;
  static updateShapeFromElement = updateShapeFromElement;
  static toTElement = toTElement;
  static createPreviewClone = createPreviewClone;
  static createCloneDrag = createCloneDrag;
  static finalizePreviewClone = finalizePreviewClone;
  static setupShapeListeners = setupShapeListeners;
  static safeStopDrag = safeStopDrag;
}
