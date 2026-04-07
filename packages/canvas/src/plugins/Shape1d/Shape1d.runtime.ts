import { throttle } from "@solid-primitives/scheduled";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc";
import Konva from "konva";
import { CustomEvents } from "../../custom-events";
import { CanvasMode } from "../../services/canvas/enum";
import { startSelectionCloneDrag } from "../shared/clone-drag";
import type { IPluginContext } from "../shared/interface";
import { TransformPlugin } from "../Transform/Transform.plugin";
import { createPreviewClone, safeStopDrag, toTElement, updateShapeFromElement } from "./Shape1d.element";
import { recordCreateHistory } from "./Shape1d.history";
import { createShapeFromElement } from "./Shape1d.render";
import { type TShape1dNode, isShape1dNode, isSupportedElementType, toPositionPatch } from "./Shape1d.shared";

export function finalizePreviewClone(context: IPluginContext, previewClone: TShape1dNode) {
  if (previewClone.isDragging()) previewClone.stopDrag();
  previewClone.moveTo(context.staticForegroundLayer);
  setupShapeListeners(context, previewClone);
  previewClone.setDraggable(true);
  context.capabilities.renderOrder?.assignOrderOnInsert({ parent: context.staticForegroundLayer, nodes: [previewClone], position: "front" });
  const createdElement = toTElement(previewClone);
  context.crdt.patch({ elements: [createdElement], groups: [] });
  recordCreateHistory({ context, setupShapeListeners }, { element: createdElement, node: previewClone, label: "clone-shape1d" });
  return previewClone;
}

export function createCloneDrag(context: IPluginContext, node: TShape1dNode) {
  const previewClone = createPreviewClone(node);
  context.dynamicLayer.add(previewClone);
  previewClone.startDrag();
  const finalizeCloneDrag = () => {
    previewClone.off("dragend", finalizeCloneDrag);
    const cloned = finalizePreviewClone(context, previewClone);
    context.setState("selection", cloned ? [cloned] : []);
  };
  previewClone.on("dragend", finalizeCloneDrag);
  return previewClone;
}

export function setupCapabilities(context: IPluginContext) {
  const previousCreate = context.capabilities.createShapeFromTElement;
  context.capabilities.createShapeFromTElement = (element) => {
    if (!isSupportedElementType(element.data.type)) return previousCreate?.(element) ?? null;
    const node = createShapeFromElement(element);
    setupShapeListeners(context, node);
    node.draggable(true);
    return node;
  };
  const previousToElement = context.capabilities.toElement;
  context.capabilities.toElement = (node) => isShape1dNode(node) ? toTElement(node) : previousToElement?.(node) ?? null;
  const previousUpdate = context.capabilities.updateShapeFromTElement;
  context.capabilities.updateShapeFromTElement = (element) => {
    if (!isSupportedElementType(element.data.type)) return previousUpdate?.(element) ?? null;
    const node = context.staticForegroundLayer.findOne((candidate: Konva.Node) => isShape1dNode(candidate) && candidate.id() === element.id);
    if (!isShape1dNode(node)) return null;
    updateShapeFromElement(node, element);
    return node;
  };
}

export function setupShapeListeners(context: IPluginContext, node: TShape1dNode) {
  let originalElement: TElement | null = null;
  let isCloneDrag = false;
  const multiDragStartPositions = new Map<string, { x: number; y: number }>();
  const passengerOriginalElements = new Map<string, TElement[]>();
  node.off("pointerclick pointerdown dragstart pointerdblclick dragmove dragend");
  node.on("pointerclick", (event) => {
    if (context.state.mode === CanvasMode.SELECT) context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERCLICK, event);
  });
  node.on("pointerdown dragstart", (event) => {
    if (context.state.mode !== CanvasMode.SELECT || context.state.editingShape1dId === node.id()) return safeStopDrag(node);
    if (event.type === "pointerdown") {
      const earlyExit = context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERDOWN, event);
      if (earlyExit) event.cancelBubble = true;
    }
    if (event.type === "dragstart" && event.evt?.altKey) {
      isCloneDrag = true;
      safeStopDrag(node);
      if (startSelectionCloneDrag(context, node)) {
        isCloneDrag = false;
        return;
      }
      createCloneDrag(context, node);
    }
  });
  node.on("pointerdblclick", (event) => {
    if (context.state.mode !== CanvasMode.SELECT) return;
    if (context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERDBLCLICK, event)) event.cancelBubble = true;
  });
  const applyElement = (element: TElement) => {
    context.capabilities.updateShapeFromTElement?.(element);
    let parent = node.getParent();
    while (parent instanceof Konva.Group) {
      parent.fire("transform");
      parent = parent.getParent();
    }
  };
  const throttledPatch = throttle((patch: Pick<TElement, "id" | "x" | "y" | "parentGroupId" | "updatedAt">) => context.crdt.patch({ elements: [patch], groups: [] }), 100);
  node.on("dragstart", (event) => {
    if (isCloneDrag || event.evt?.altKey) return;
    originalElement = toTElement(node);
    multiDragStartPositions.clear();
    passengerOriginalElements.clear();
    for (const selectedNode of TransformPlugin.filterSelection(context.state.selection)) {
      multiDragStartPositions.set(selectedNode.id(), { ...selectedNode.absolutePosition() });
      if (selectedNode === node) continue;
      if (selectedNode instanceof Konva.Shape) {
        const element = context.capabilities.toElement?.(selectedNode);
        if (element) passengerOriginalElements.set(selectedNode.id(), [structuredClone(element)]);
      } else if (selectedNode instanceof Konva.Group) {
        const childElements = (selectedNode.find((child: Konva.Node) => child instanceof Konva.Shape) as Konva.Shape[]).map((child) => context.capabilities.toElement?.(child)).filter(Boolean) as TElement[];
        passengerOriginalElements.set(selectedNode.id(), structuredClone(childElements));
      }
    }
  });
  node.on("dragmove", () => {
    if (isCloneDrag) return;
    throttledPatch(toPositionPatch(node));
    const selected = TransformPlugin.filterSelection(context.state.selection);
    if (selected.length <= 1) return;
    const start = multiDragStartPositions.get(node.id());
    if (!start) return;
    const current = node.absolutePosition();
    const dx = current.x - start.x;
    const dy = current.y - start.y;
    for (const other of selected) {
      if (other === node || other.isDragging()) continue;
      const otherStart = multiDragStartPositions.get(other.id());
      if (otherStart) other.absolutePosition({ x: otherStart.x + dx, y: otherStart.y + dy });
    }
  });
  node.on("dragend", () => {
    if (isCloneDrag) {
      isCloneDrag = false;
      originalElement = null;
      multiDragStartPositions.clear();
      passengerOriginalElements.clear();
      return;
    }
    const nextElement = toTElement(node);
    const beforeElement = originalElement ? structuredClone(originalElement) : null;
    const afterElement = structuredClone(nextElement);
    context.crdt.patch({ elements: [afterElement], groups: [] });
    const selected = TransformPlugin.filterSelection(context.state.selection);
    const passengers = selected.filter((selectedNode) => selectedNode !== node);
    const passengerAfterElements = new Map<string, TElement[]>();
    for (const passenger of passengers) {
      if (passenger instanceof Konva.Shape) {
        const element = context.capabilities.toElement?.(passenger);
        if (!element) continue;
        const elements = [structuredClone(element)];
        passengerAfterElements.set(passenger.id(), elements);
        context.crdt.patch({ elements, groups: [] });
      } else if (passenger instanceof Konva.Group) {
        const childElements = (passenger.find((child: Konva.Node) => child instanceof Konva.Shape) as Konva.Shape[]).map((child) => context.capabilities.toElement?.(child)).filter(Boolean) as TElement[];
        const cloned = structuredClone(childElements);
        passengerAfterElements.set(passenger.id(), cloned);
        if (cloned.length > 0) context.crdt.patch({ elements: cloned, groups: [] });
      }
    }
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
        for (const passenger of passengers) {
          const startPos = capturedStartPositions.get(passenger.id());
          if (startPos) passenger.absolutePosition(startPos);
          const originalEls = capturedPassengerOriginals.get(passenger.id());
          if (originalEls && originalEls.length > 0) context.crdt.patch({ elements: originalEls, groups: [] });
        }
      },
      redo() {
        applyElement(afterElement);
        context.crdt.patch({ elements: [afterElement], groups: [] });
        for (const passenger of passengers) {
          const afterEls = passengerAfterElements.get(passenger.id());
          if (!afterEls || afterEls.length === 0 || !(passenger instanceof Konva.Shape)) continue;
          context.capabilities.updateShapeFromTElement?.(afterEls[0]);
          context.crdt.patch({ elements: afterEls, groups: [] });
        }
      },
    });
  });
}
