import { throttle } from "@solid-primitives/scheduled";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import { fxFilterSelection } from "../../core/fn.filter-selection";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { RenderOrderService } from "../../new-services/render-order/RenderOrderService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import { CanvasMode } from "../../new-services/selection/enum";
import type { IHooks, TElementPointerEvent } from "../../runtime";
import { fxSerializeSubtreeElements } from "../group/fn.serialize-subtree-elements";
import { createPreviewClone, safeStopDrag, toTElement } from "./Shape1d.element";
import { recordCreateHistory, type TPortalRecordShape1dHistory } from "./Shape1d.history";
import { type TShape1dNode, toPositionPatch } from "./Shape1d.shared";

export type TPortalShape1dRuntime = TPortalRecordShape1dHistory & {
  hooks: IHooks;
  createId: () => string;
  now: () => number;
};

function findSceneNodeById(render: RenderService, id: string) {
  const node = render.staticForegroundLayer.findOne((candidate: Konva.Node) => {
    return (candidate instanceof render.Group || candidate instanceof render.Shape) && candidate.id() === id;
  });

  if (!(node instanceof render.Group) && !(node instanceof render.Shape)) {
    return null;
  }

  return node;
}

function applyElement(portal: TPortalShape1dRuntime, element: TElement) {
  const didUpdate = portal.editor.updateShapeFromTElement(element);
  if (!didUpdate) {
    return;
  }

  let parent = findSceneNodeById(portal.render, element.id)?.getParent();
  while (parent instanceof portal.render.Group) {
    parent.fire("transform");
    parent = parent.getParent();
  }
}

function serializeNodeElements(portal: TPortalShape1dRuntime, node: Konva.Node) {
  if (node instanceof portal.render.Shape) {
    const element = portal.editor.toElement(node);
    return element ? [structuredClone(element)] : [];
  }

  if (node instanceof portal.render.Group) {
    return fxSerializeSubtreeElements({
      editor: portal.editor,
      render: portal.render,
      group: node,
    }).map((element) => structuredClone(element));
  }

  return [] as TElement[];
}

export function finalizePreviewClone(portal: TPortalShape1dRuntime, previewClone: TShape1dNode) {
  if (previewClone.isDragging()) {
    previewClone.stopDrag();
  }

  previewClone.moveTo(portal.render.staticForegroundLayer);
  portal.setupNode(previewClone);
  previewClone.setDraggable(true);
  portal.renderOrder.assignOrderOnInsert({
    parent: portal.render.staticForegroundLayer,
    nodes: [previewClone],
    position: "front",
  });

  const createdElement = toTElement(previewClone);
  portal.crdt.patch({ elements: [createdElement], groups: [] });
  recordCreateHistory(portal, {
    element: createdElement,
    node: previewClone,
    label: "clone-shape1d",
  });
  portal.render.dynamicLayer.batchDraw();
  portal.render.staticForegroundLayer.batchDraw();
  return previewClone;
}

export function createCloneDrag(portal: TPortalShape1dRuntime, node: TShape1dNode) {
  const previewClone = createPreviewClone(node, portal.createId, portal.now);
  portal.render.dynamicLayer.add(previewClone);
  previewClone.startDrag();

  const finalizeCloneDrag = () => {
    previewClone.off("dragend", finalizeCloneDrag);
    const cloned = finalizePreviewClone(portal, previewClone);
    portal.selection.setSelection(cloned ? [cloned] : []);
    portal.selection.setFocusedNode(cloned);
  };

  previewClone.on("dragend", finalizeCloneDrag);
  return previewClone;
}

export function setupShapeListeners(portal: TPortalShape1dRuntime, node: TShape1dNode) {
  if (node.getAttr("vcShape1dNodeSetup") === true) {
    node.off("pointerclick pointerdown dragstart pointerdblclick dragmove dragend");
  }

  node.setAttr("vcShape1dNodeSetup", true);

  let originalElement: TElement | null = null;
  let isCloneDrag = false;
  const multiDragStartPositions = new Map<string, { x: number; y: number }>();
  const passengerOriginalElements = new Map<string, TElement[]>();
  const throttledPatch = throttle((patch: Pick<TElement, "id" | "x" | "y" | "parentGroupId" | "updatedAt">) => {
    portal.crdt.patch({ elements: [patch], groups: [] });
  }, 100);

  node.on("pointerclick", (event) => {
    if (portal.selection.mode !== CanvasMode.SELECT) {
      return;
    }

    portal.hooks.elementPointerClick.call(event as TElementPointerEvent);
  });

  node.on("pointerdown dragstart", (event) => {
    if (portal.selection.mode !== CanvasMode.SELECT || portal.editor.editingShape1dId === node.id()) {
      safeStopDrag(node);
      return;
    }

    if (event.type === "pointerdown") {
      const earlyExit = portal.hooks.elementPointerDown.call(event as TElementPointerEvent);
      if (earlyExit) {
        event.cancelBubble = true;
      }
      return;
    }

    if (event.evt?.altKey) {
      isCloneDrag = true;
      safeStopDrag(node);
      createCloneDrag(portal, node);
      return;
    }

    originalElement = toTElement(node);
    multiDragStartPositions.clear();
    passengerOriginalElements.clear();

    const selected = fxFilterSelection({
      render: portal.render,
      selection: portal.selection.selection,
    });
    selected.forEach((selectedNode) => {
      multiDragStartPositions.set(selectedNode.id(), { ...selectedNode.absolutePosition() });
      if (selectedNode === node) {
        return;
      }

      const elements = serializeNodeElements(portal, selectedNode);
      if (elements.length > 0) {
        passengerOriginalElements.set(selectedNode.id(), elements);
      }
    });
  });

  node.on("pointerdblclick", (event) => {
    if (portal.selection.mode !== CanvasMode.SELECT) {
      return;
    }

    const earlyExit = portal.hooks.elementPointerDoubleClick.call(event as TElementPointerEvent);
    if (earlyExit) {
      event.cancelBubble = true;
    }
  });

  node.on("dragmove", () => {
    if (isCloneDrag) {
      return;
    }

    throttledPatch(toPositionPatch(portal.render, node));

    const selected = fxFilterSelection({
      render: portal.render,
      selection: portal.selection.selection,
    });
    if (selected.length <= 1) {
      return;
    }

    const start = multiDragStartPositions.get(node.id());
    if (!start) {
      return;
    }

    const current = node.absolutePosition();
    const dx = current.x - start.x;
    const dy = current.y - start.y;

    selected.forEach((other) => {
      if (other === node || other.isDragging()) {
        return;
      }

      const otherStart = multiDragStartPositions.get(other.id());
      if (!otherStart) {
        return;
      }

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

    const nextElement = toTElement(node);
    const beforeElement = originalElement ? structuredClone(originalElement) : null;
    const afterElement = structuredClone(nextElement);
    portal.crdt.patch({ elements: [afterElement], groups: [] });

    const selected = fxFilterSelection({
      render: portal.render,
      selection: portal.selection.selection,
    });
    const passengers = selected.filter((selectedNode) => selectedNode !== node);
    const passengerAfterElements = new Map<string, TElement[]>();
    const passengerEndPositions = new Map<string, { x: number; y: number }>();

    passengers.forEach((passenger) => {
      passengerEndPositions.set(passenger.id(), { ...passenger.absolutePosition() });
      const elements = serializeNodeElements(portal, passenger);
      if (elements.length === 0) {
        return;
      }

      passengerAfterElements.set(passenger.id(), elements);
      portal.crdt.patch({ elements, groups: [] });
    });

    const capturedStartPositions = new Map(multiDragStartPositions);
    const capturedEndPositions = new Map(passengerEndPositions);
    const capturedPassengerOriginals = new Map(passengerOriginalElements);
    multiDragStartPositions.clear();
    passengerOriginalElements.clear();
    originalElement = null;

    if (!beforeElement) {
      return;
    }

    const didMove = beforeElement.x !== afterElement.x || beforeElement.y !== afterElement.y;
    if (!didMove) {
      return;
    }

    portal.history.record({
      label: "drag-shape1d",
      undo() {
        applyElement(portal, beforeElement);
        portal.crdt.patch({ elements: [beforeElement], groups: [] });
        passengers.forEach((passenger) => {
          const startPos = capturedStartPositions.get(passenger.id());
          if (startPos) {
            passenger.absolutePosition(startPos);
          }

          const originalEls = capturedPassengerOriginals.get(passenger.id());
          if (!originalEls || originalEls.length === 0) {
            return;
          }

          originalEls.forEach((element) => {
            applyElement(portal, element);
          });
          portal.crdt.patch({ elements: originalEls, groups: [] });
        });
      },
      redo() {
        applyElement(portal, afterElement);
        portal.crdt.patch({ elements: [afterElement], groups: [] });
        passengers.forEach((passenger) => {
          const endPos = capturedEndPositions.get(passenger.id());
          if (endPos) {
            passenger.absolutePosition(endPos);
          }

          const afterEls = passengerAfterElements.get(passenger.id());
          if (!afterEls || afterEls.length === 0) {
            return;
          }

          afterEls.forEach((element) => {
            applyElement(portal, element);
          });
          portal.crdt.patch({ elements: afterEls, groups: [] });
        });
      },
    });
  });
}
