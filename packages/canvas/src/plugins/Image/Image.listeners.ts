import { throttle } from "@solid-primitives/scheduled";
import type { TElement } from "@vibecanvas/automerge-service/types/canvas-doc";
import Konva from "konva";
import { CustomEvents } from "../../custom-events";
import { CanvasMode } from "../../services/canvas/enum";
import { startSelectionCloneDrag } from "../shared/clone-drag";
import type { IPluginContext } from "../shared/interface";
import { TransformPlugin } from "../Transform/Transform.plugin";

export function safeStopDrag(_runtime: void, node: Konva.Node) {
  try {
    if (node.isDragging()) {
      node.stopDrag();
    }
  } catch {
    return;
  }
}

export function setupImageListeners(
  runtime: {
    context: IPluginContext;
    toTElement: (node: Konva.Image) => TElement;
    safeStopDrag: (node: Konva.Node) => void;
    createCloneDrag: (context: IPluginContext, node: Konva.Image) => Konva.Image;
  },
  payload: { node: Konva.Image },
) {
  let originalElement: TElement | null = null;
  let isCloneDrag = false;
  const multiDragStartPositions = new Map<string, { x: number; y: number }>();
  const passengerOriginalElements = new Map<string, TElement[]>();

  const applyElement = (element: TElement) => {
    runtime.context.capabilities.updateShapeFromTElement?.(element);
    let parent = payload.node.getParent();
    while (parent instanceof Konva.Group) {
      parent.fire("transform");
      parent = parent.getParent();
    }
  };

  const throttledPatch = throttle((element: TElement) => {
    runtime.context.crdt.patch({ elements: [element], groups: [] });
  }, 100);

  payload.node.on("pointerclick", (event) => {
    if (runtime.context.state.mode !== CanvasMode.SELECT) return;
    runtime.context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERCLICK, event);
  });

  payload.node.on("pointerdown dragstart", (event) => {
    if (runtime.context.state.mode !== CanvasMode.SELECT) {
      payload.node.stopDrag();
      return;
    }

    if (event.type === "pointerdown") {
      const earlyExit = runtime.context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERDOWN, event);
      if (earlyExit) event.cancelBubble = true;
    }

    if (event.type === "dragstart" && event.evt.altKey) {
      isCloneDrag = true;
      runtime.safeStopDrag(payload.node);
      if (startSelectionCloneDrag(runtime.context, payload.node)) {
        isCloneDrag = false;
        return;
      }
      runtime.createCloneDrag(runtime.context, payload.node);
      return;
    }
  });

  payload.node.on("pointerdblclick", (event) => {
    if (runtime.context.state.mode !== CanvasMode.SELECT) return;
    const earlyExit = runtime.context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERDBLCLICK, event);
    if (earlyExit) event.cancelBubble = true;
  });

  payload.node.on("dragstart", () => {
    if (isCloneDrag) return;
    originalElement = runtime.toTElement(payload.node);
    multiDragStartPositions.clear();
    passengerOriginalElements.clear();

    const selected = TransformPlugin.filterSelection(runtime.context.state.selection);
    selected.forEach((selectedNode) => {
      multiDragStartPositions.set(selectedNode.id(), { ...selectedNode.absolutePosition() });
      if (selectedNode === payload.node) return;

      if (selectedNode instanceof Konva.Shape) {
        const element = runtime.context.capabilities.toElement?.(selectedNode);
        if (element) passengerOriginalElements.set(selectedNode.id(), [structuredClone(element)]);
        return;
      }

      if (selectedNode instanceof Konva.Group) {
        const childElements = (selectedNode.find((child: Konva.Node) => child instanceof Konva.Shape) as Konva.Shape[])
          .map((child) => runtime.context.capabilities.toElement?.(child))
          .filter(Boolean) as TElement[];
        passengerOriginalElements.set(selectedNode.id(), structuredClone(childElements));
      }
    });
  });

  payload.node.on("dragmove", () => {
    if (isCloneDrag) return;
    throttledPatch(runtime.toTElement(payload.node));

    const selected = TransformPlugin.filterSelection(runtime.context.state.selection);
    if (selected.length <= 1) return;

    const start = multiDragStartPositions.get(payload.node.id());
    if (!start) return;

    const current = payload.node.absolutePosition();
    const dx = current.x - start.x;
    const dy = current.y - start.y;
    selected.forEach((other) => {
      if (other === payload.node) return;
      if (other.isDragging()) return;

      const otherStart = multiDragStartPositions.get(other.id());
      if (!otherStart) return;

      other.absolutePosition({ x: otherStart.x + dx, y: otherStart.y + dy });
    });
  });

  payload.node.on("dragend", () => {
    if (isCloneDrag) {
      isCloneDrag = false;
      originalElement = null;
      multiDragStartPositions.clear();
      passengerOriginalElements.clear();
      return;
    }

    const nextElement = runtime.toTElement(payload.node);
    const beforeElement = originalElement ? structuredClone(originalElement) : null;
    const afterElement = structuredClone(nextElement);
    runtime.context.crdt.patch({ elements: [afterElement], groups: [] });

    const selected = TransformPlugin.filterSelection(runtime.context.state.selection);
    const passengers = selected.filter((selectedNode) => selectedNode !== payload.node);
    const passengerAfterElements = new Map<string, TElement[]>();

    passengers.forEach((passenger) => {
      if (passenger instanceof Konva.Shape) {
        const element = runtime.context.capabilities.toElement?.(passenger);
        if (!element) return;

        const elements = [structuredClone(element)];
        passengerAfterElements.set(passenger.id(), elements);
        runtime.context.crdt.patch({ elements, groups: [] });
        return;
      }

      if (passenger instanceof Konva.Group) {
        const childElements = (passenger.find((child: Konva.Node) => child instanceof Konva.Shape) as Konva.Shape[])
          .map((child) => runtime.context.capabilities.toElement?.(child))
          .filter(Boolean) as TElement[];
        const elements = structuredClone(childElements);
        passengerAfterElements.set(passenger.id(), elements);
        if (elements.length > 0) {
          runtime.context.crdt.patch({ elements, groups: [] });
        }
      }
    });

    const capturedStartPositions = new Map(multiDragStartPositions);
    const capturedPassengerOriginals = new Map(passengerOriginalElements);
    multiDragStartPositions.clear();
    originalElement = null;

    if (!beforeElement) return;

    const didMove = beforeElement.x !== afterElement.x || beforeElement.y !== afterElement.y;
    if (!didMove) return;

    runtime.context.history.record({
      label: "drag-image",
      undo() {
        applyElement(beforeElement);
        runtime.context.crdt.patch({ elements: [beforeElement], groups: [] });
        passengers.forEach((passenger) => {
          const startPos = capturedStartPositions.get(passenger.id());
          if (startPos) passenger.absolutePosition(startPos);

          const originalEls = capturedPassengerOriginals.get(passenger.id());
          if (originalEls && originalEls.length > 0) {
            runtime.context.crdt.patch({ elements: originalEls, groups: [] });
          }
        });
      },
      redo() {
        applyElement(afterElement);
        runtime.context.crdt.patch({ elements: [afterElement], groups: [] });
        passengers.forEach((passenger) => {
          const afterEls = passengerAfterElements.get(passenger.id());
          if (!afterEls || afterEls.length === 0) return;

          if (passenger instanceof Konva.Shape) {
            runtime.context.capabilities.updateShapeFromTElement?.(afterEls[0]);
            runtime.context.crdt.patch({ elements: afterEls, groups: [] });
            return;
          }

          const startPos = capturedStartPositions.get(passenger.id());
          if (startPos) {
            const dx = afterElement.x - beforeElement.x;
            const dy = afterElement.y - beforeElement.y;
            passenger.absolutePosition({ x: startPos.x + dx, y: startPos.y + dy });
          }
          runtime.context.crdt.patch({ elements: afterEls, groups: [] });
        });
      },
    });
  });
}
