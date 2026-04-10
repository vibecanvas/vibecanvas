import { TElement } from "@vibecanvas/service-automerge/types/canvas-doc";
import Konva from "konva";
import { throttle } from "@solid-primitives/scheduled";
import { CustomEvents } from "../../custom-events";
import { CanvasMode } from "../../services/canvas/enum";
import { startSelectionCloneDrag } from "../shared/clone-drag";
import type { IPluginContext } from "../shared/interface";
import { TransformPlugin } from "../Transform/Transform.plugin";
import type { toTElement as toTElementType } from "./Text.serialization";

type SetupShapeListenersDeps = {
  createCloneDrag: (context: IPluginContext, node: Konva.Text) => Konva.Text;
  enterEditMode: (context: IPluginContext, node: Konva.Text, isNew: boolean) => unknown;
  safeStopDrag: (node: Konva.Node) => void;
  toTElement: typeof toTElementType;
};

export function setupShapeListeners(
  context: IPluginContext,
  node: Konva.Text,
  deps: SetupShapeListenersDeps,
) {
  let originalElement: TElement | null = null;
  let isCloneDrag = false;
  const multiDragStartPositions = new Map<string, { x: number; y: number }>();
  const passengerOriginalElements = new Map<string, TElement[]>();

  node.on('pointerclick', (e) => {
    if (context.state.mode !== CanvasMode.SELECT) return;
    context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERCLICK, e);
  });

  node.on('pointerdown dragstart', (e) => {
    if (context.state.mode !== CanvasMode.SELECT) {
      node.stopDrag();
      return;
    }
    if (e.type === 'pointerdown') {
      const earlyExit = context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERDOWN, e);
      if (earlyExit) e.cancelBubble = true;
    }

    if (e.type === 'dragstart' && e.evt?.altKey) {
      isCloneDrag = true;
      deps.safeStopDrag(node);
      if (startSelectionCloneDrag(context, node)) {
        isCloneDrag = false;
        return;
      }
      deps.createCloneDrag(context, node);
    }
  });

  node.on('pointerdblclick', (e) => {
    if (context.state.mode !== CanvasMode.SELECT) return;
    const earlyExit = context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERDBLCLICK, e);
    if (earlyExit) {
      e.cancelBubble = true;
      return;
    }
    deps.enterEditMode(context, node, false);
    e.cancelBubble = true;
  });

  const applyElement = (element: TElement) => {
    context.capabilities.updateShapeFromTElement?.(element);
    let parent = node.getParent();
    while (parent instanceof Konva.Group) {
      parent.fire('transform');
      parent = parent.getParent();
    }
  };

  const throttledPatch = throttle((element: TElement) => {
    context.crdt.patch({ elements: [element], groups: [] });
  }, 100);

  node.on('dragstart', (e) => {
    if (isCloneDrag || e.evt?.altKey) return;
    originalElement = deps.toTElement(node);
    multiDragStartPositions.clear();
    passengerOriginalElements.clear();
    const selected = TransformPlugin.filterSelection(context.state.selection);
    selected.forEach((n) => {
      multiDragStartPositions.set(n.id(), { ...n.absolutePosition() });
      if (n === node) return;
      if (n instanceof Konva.Shape) {
        const el = context.capabilities.toElement?.(n);
        if (el) passengerOriginalElements.set(n.id(), [structuredClone(el)]);
      } else if (n instanceof Konva.Group) {
        const childEls = (n.find((child: Konva.Node) => child instanceof Konva.Shape) as Konva.Shape[])
          .map((child) => context.capabilities.toElement?.(child))
          .filter(Boolean) as TElement[];
        passengerOriginalElements.set(n.id(), structuredClone(childEls));
      }
    });
  });

  node.on('transform', () => {
    const scale = node.scaleX();
    node.setAttrs({
      width: node.width() * scale,
      height: node.height() * node.scaleY(),
      fontSize: Math.max(1, node.fontSize() * scale),
      scaleX: 1,
      scaleY: 1,
    });
  });

  node.on('dragmove', () => {
    if (isCloneDrag) return;
    throttledPatch(deps.toTElement(node));
    const selected = TransformPlugin.filterSelection(context.state.selection);
    if (selected.length <= 1) return;
    const start = multiDragStartPositions.get(node.id());
    if (!start) return;
    const cur = node.absolutePosition();
    const dx = cur.x - start.x;
    const dy = cur.y - start.y;
    selected.forEach((other) => {
      if (other === node) return;
      if (other.isDragging()) return;
      const os = multiDragStartPositions.get(other.id());
      if (!os) return;
      other.absolutePosition({ x: os.x + dx, y: os.y + dy });
    });
  });

  node.on('dragend', () => {
    if (isCloneDrag) {
      isCloneDrag = false;
      originalElement = null;
      multiDragStartPositions.clear();
      passengerOriginalElements.clear();
      return;
    }

    const nextElement = deps.toTElement(node);
    const beforeElement = originalElement ? structuredClone(originalElement) : null;
    const afterElement = structuredClone(nextElement);
    context.crdt.patch({ elements: [afterElement], groups: [] });

    const selected = TransformPlugin.filterSelection(context.state.selection);
    const passengers = selected.filter((n) => n !== node);
    const passengerAfterElements = new Map<string, TElement[]>();
    passengers.forEach((passenger) => {
      if (passenger instanceof Konva.Shape) {
        const el = context.capabilities.toElement?.(passenger);
        if (el) {
          const els = [structuredClone(el)];
          passengerAfterElements.set(passenger.id(), els);
          context.crdt.patch({ elements: els, groups: [] });
        }
      } else if (passenger instanceof Konva.Group) {
        const childEls = (passenger.find((child: Konva.Node) => child instanceof Konva.Shape) as Konva.Shape[])
          .map((child) => context.capabilities.toElement?.(child))
          .filter(Boolean) as TElement[];
        const cloned = structuredClone(childEls);
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
      label: 'drag-text',
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
