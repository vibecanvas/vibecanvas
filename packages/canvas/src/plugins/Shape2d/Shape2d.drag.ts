import { TElement, TTextData } from "@vibecanvas/automerge-service/types/canvas-doc";
import { throttle } from "@solid-primitives/scheduled";
import Konva from "konva";
import { CustomEvents } from "../../custom-events";
import { CanvasMode } from "../../services/canvas/enum";
import { startSelectionCloneDrag } from "../shared/clone-drag";
import type { IPluginContext } from "../shared/interface";
import { TextPlugin } from "../Text/Text.plugin";
import { TransformPlugin } from "../Transform/Transform.plugin";
import { createAttachedTextNode, getAttachedTextNode, syncAttachedTextToRect } from "./Shape2d.attached-text";
import { createPreviewClone, createShapeFromNode, toTElement } from "./Shape2d.shared";

export function setupShapeListeners(deps: { context: IPluginContext }, shape: Konva.Shape) {
  const { context } = deps;
  let originalElement: TElement | null = null;
  const multiDragStartPositions = new Map<string, { x: number; y: number }>();
  const passengerOriginalElements = new Map<string, TElement[]>();

  shape.on("pointerclick", (e) => {
    if (context.state.mode !== CanvasMode.SELECT) return;
    context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERCLICK, e);
  });

  shape.on("pointerdown dragstart", (e) => {
    if (context.state.mode !== CanvasMode.SELECT) {
      shape.stopDrag();
      return;
    }

    if (e.type === "pointerdown") {
      const earlyExit = context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERDOWN, e);
      if (earlyExit) e.cancelBubble = true;
    }

    if (e.type === "dragstart" && e.evt.altKey) {
      shape.stopDrag();
      if (startSelectionCloneDrag(context, shape)) return;
      createCloneDrag(deps, shape);
    }
  });

  shape.on("pointerdblclick", (e) => {
    if (context.state.mode !== CanvasMode.SELECT) return;
    const earlyExit = context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERDBLCLICK, e);
    if (earlyExit) {
      e.cancelBubble = true;
      return;
    }

    if (shape instanceof Konva.Rect) {
      if (openAttachedTextEditMode(deps, shape)) {
        e.cancelBubble = true;
      }
    }
  });

  const applyElement = (element: TElement) => {
    context.capabilities.updateShapeFromTElement?.(element);
    let parent = shape.getParent();

    while (parent instanceof Konva.Group) {
      parent.fire("transform");
      parent = parent.getParent();
    }
  };

  const throttledPatch = throttle((element: TElement) => {
    context.crdt.patch({ elements: [element], groups: [] });
  }, 100);

  shape.on("dragstart", () => {
    originalElement = toTElement(shape);
    multiDragStartPositions.clear();
    passengerOriginalElements.clear();
    const selected = TransformPlugin.filterSelection(context.state.selection);
    selected.forEach((node) => {
      multiDragStartPositions.set(node.id(), { ...node.absolutePosition() });
      if (node === shape) return;

      if (node instanceof Konva.Shape) {
        const element = context.capabilities.toElement?.(node);
        if (element) passengerOriginalElements.set(node.id(), [structuredClone(element)]);
        return;
      }

      if (node instanceof Konva.Group) {
        const childElements = (node.find((child: Konva.Node) => child instanceof Konva.Shape) as Konva.Shape[])
          .map((child) => context.capabilities.toElement?.(child))
          .filter(Boolean) as TElement[];
        passengerOriginalElements.set(node.id(), structuredClone(childElements));
      }
    });
  });

  shape.on("dragmove", () => {
    throttledPatch(toTElement(shape));
    if (shape instanceof Konva.Rect) {
      syncAttachedTextToRect(deps, { rect: shape });
    }

    const selected = TransformPlugin.filterSelection(context.state.selection);
    if (selected.length <= 1) return;

    const start = multiDragStartPositions.get(shape.id());
    if (!start) return;

    const cur = shape.absolutePosition();
    const dx = cur.x - start.x;
    const dy = cur.y - start.y;
    selected.forEach((other) => {
      if (other === shape || other.isDragging()) return;
      const otherStart = multiDragStartPositions.get(other.id());
      if (!otherStart) return;
      other.absolutePosition({ x: otherStart.x + dx, y: otherStart.y + dy });
    });
  });

  shape.on("dragend", () => {
    const nextElement = toTElement(shape);
    const beforeElement = originalElement ? structuredClone(originalElement) : null;
    const afterElement = structuredClone(nextElement);

    context.crdt.patch({ elements: [afterElement], groups: [] });
    if (shape instanceof Konva.Rect) {
      syncAttachedTextToRect(deps, { rect: shape });
    }

    const selected = TransformPlugin.filterSelection(context.state.selection);
    const passengers = selected.filter((node) => node !== shape);
    const passengerAfterElements = new Map<string, TElement[]>();
    passengers.forEach((passenger) => {
      if (passenger instanceof Konva.Shape) {
        const element = context.capabilities.toElement?.(passenger);
        if (!element) return;
        const elements = [structuredClone(element)];
        passengerAfterElements.set(passenger.id(), elements);
        context.crdt.patch({ elements, groups: [] });
        return;
      }

      if (passenger instanceof Konva.Group) {
        const childElements = (passenger.find((child: Konva.Node) => child instanceof Konva.Shape) as Konva.Shape[])
          .map((child) => context.capabilities.toElement?.(child))
          .filter(Boolean) as TElement[];
        const cloned = structuredClone(childElements);
        passengerAfterElements.set(passenger.id(), cloned);
        if (cloned.length > 0) context.crdt.patch({ elements: cloned, groups: [] });
      }
    });

    const capturedStartPositions = new Map(multiDragStartPositions);
    const capturedPassengerOriginals = new Map(passengerOriginalElements);
    multiDragStartPositions.clear();
    originalElement = null;

    if (!beforeElement) return;

    const didMove = beforeElement.x !== afterElement.x || beforeElement.y !== afterElement.y;
    if (!didMove) return;

    context.history.record({
      label: "drag-shape",
      undo() {
        applyElement(beforeElement);
        context.crdt.patch({ elements: [beforeElement], groups: [] });
        if (shape instanceof Konva.Rect) {
          syncAttachedTextToRect(deps, { rect: shape });
        }
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
        if (shape instanceof Konva.Rect) {
          syncAttachedTextToRect(deps, { rect: shape });
        }
        passengers.forEach((passenger) => {
          const afterEls = passengerAfterElements.get(passenger.id());
          if (!afterEls || afterEls.length === 0) return;
          if (passenger instanceof Konva.Shape) {
            context.capabilities.updateShapeFromTElement?.(afterEls[0]);
            context.crdt.patch({ elements: afterEls, groups: [] });
            return;
          }
          if (passenger instanceof Konva.Group) {
            const startPos = capturedStartPositions.get(passenger.id());
            if (startPos) {
              const dx = afterElement.x - beforeElement.x;
              const dy = afterElement.y - beforeElement.y;
              passenger.absolutePosition({ x: startPos.x + dx, y: startPos.y + dy });
            }
            context.crdt.patch({ elements: afterEls, groups: [] });
          }
        });
      },
    });
  });

  shape.on("transform", () => {
    if (shape instanceof Konva.Rect) {
      syncAttachedTextToRect(deps, { rect: shape });
    }
  });
}

export function createCloneDrag(deps: { context: IPluginContext }, shape: Konva.Shape) {
  const previewShape = createPreviewClone(shape);
  if (!previewShape) return null;

  deps.context.dynamicLayer.add(previewShape);
  previewShape.startDrag();
  previewShape.on("dragend", () => {
    const newShape = finalizePreviewClone(deps, { sourceShape: shape, previewShape });
    if (!newShape) return;
    deps.context.setState("selection", [newShape]);
  });

  return previewShape;
}

export function finalizePreviewClone(
  deps: { context: IPluginContext },
  payload: { sourceShape: Konva.Shape; previewShape: Konva.Shape },
) {
  const { context } = deps;
  const { sourceShape, previewShape } = payload;
  const newShape = createShapeFromNode(previewShape);
  previewShape.destroy();

  if (!newShape) return null;

  setupShapeListeners(deps, newShape);
  newShape.setDraggable(true);
  context.staticForegroundLayer.add(newShape);
  context.capabilities.renderOrder?.assignOrderOnInsert({
    parent: context.staticForegroundLayer,
    nodes: [newShape],
    position: "front",
  });

  const createdElements: TElement[] = [toTElement(newShape)];
  if (sourceShape instanceof Konva.Rect && newShape instanceof Konva.Rect) {
    const sourceAttachedText = getAttachedTextNode(deps, sourceShape);
    if (sourceAttachedText) {
      const sourceElement = TextPlugin.toTElement(sourceAttachedText);
      if (sourceElement.data.type !== "text") {
        throw new Error("Expected attached text element data to be text");
      }
      const sourceTextData: TTextData = sourceElement.data;
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
      });

      TextPlugin.setupShapeListeners(context, clonedText);
      context.staticForegroundLayer.add(clonedText);
      context.capabilities.renderOrder?.assignOrderOnInsert({
        parent: context.staticForegroundLayer,
        nodes: [newShape, clonedText],
        position: "front",
      });
      syncAttachedTextToRect(deps, { rect: newShape, textNode: clonedText });
      createdElements.push(TextPlugin.toTElement(clonedText));
    }
  }

  context.crdt.patch({ elements: createdElements, groups: [] });
  return newShape;
}

function openAttachedTextEditMode(deps: { context: IPluginContext }, rect: Konva.Rect) {
  const { context } = deps;
  if (context.state.mode !== CanvasMode.SELECT) return false;
  if (context.state.editingTextId !== null) return false;

  let textNode = getAttachedTextNode(deps, rect);
  const isNew = textNode === null;
  if (textNode === null) {
    textNode = createAttachedTextNode(deps, rect);
  }

  syncAttachedTextToRect(deps, { rect, textNode });
  TextPlugin.enterEditMode(context, textNode, isNew);
  return true;
}

export function handleAttachedTextShortcut(deps: { context: IPluginContext }, event: KeyboardEvent) {
  const { context } = deps;
  if (event.key !== "Enter") return;
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
  openAttachedTextEditMode(deps, rect);
}
