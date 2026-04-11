import { throttle } from "@solid-primitives/scheduled";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import Konva from "konva";
import { CustomEvents } from "../../custom-events";
import { CanvasMode } from "../../services/canvas/enum";
import { TransformPlugin } from "../Transform/Transform.plugin";
import { startSelectionCloneDrag } from "../shared/clone-drag";
import type { IPluginContext } from "../shared/interface";
import { getWorldPosition } from "../shared/node-space";
import { createPenCloneDrag } from "./pen.clone";
import { penPathToElement } from "./pen.element";

export function safeStopPenDrag(node: Konva.Node) {
  try {
    if (node.isDragging()) {
      node.stopDrag();
    }
  } catch {
    return;
  }
}

export function penNodeToPositionPatch(node: Konva.Path) {
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

export function setupPenShapeListeners(context: IPluginContext, node: Konva.Path) {
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
      safeStopPenDrag(node);
      return;
    }

    if (event.type === "pointerdown") {
      const earlyExit = context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERDOWN, event);
      if (earlyExit) event.cancelBubble = true;
    }

    if (event.type === "dragstart" && event.evt?.altKey) {
      isCloneDrag = true;
      safeStopPenDrag(node);
      if (startSelectionCloneDrag(context, node)) {
        isCloneDrag = false;
        return;
      }
      createPenCloneDrag(context, node);
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

    originalElement = penPathToElement(node);
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

    throttledPatch(penNodeToPositionPatch(node));
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

    const nextElement = penPathToElement(node);
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
