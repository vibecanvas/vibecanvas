import { throttle } from "@solid-primitives/scheduled";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import type { IHooks, TElementPointerEvent } from "../../runtime";
import { getWorldPosition } from "../../core/node-space";
import { isPenNode } from "./pen.element";
import { fxSerializeSubtreeElements } from "../group/fn.serialize-subtree-elements";

export type TPenListenersPortal = {
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  render: RenderService;
  selection: SelectionService;
  hooks: IHooks;
  createPenCloneDrag: (node: Konva.Path) => Konva.Path;
  createPenPreviewClone: (node: Konva.Path) => Konva.Path;
  finalizePenPreviewClone: (node: Konva.Path) => Konva.Path;
  filterSelection: (selection: Konva.Node[]) => Konva.Node[];
  safeStopDrag: (node: Konva.Node) => void;
  toElement: (node: Konva.Path) => TElement;
};

export function safeStopPenDrag(node: Konva.Node) {
  try {
    if (node.isDragging()) {
      node.stopDrag();
    }
  } catch {
    return;
  }
}

export function penNodeToPositionPatch(render: RenderService, node: Konva.Path) {
  const worldPosition = getWorldPosition(node);
  const parent = node.getParent();

  return {
    id: node.id(),
    x: worldPosition.x,
    y: worldPosition.y,
    parentGroupId: parent instanceof render.Group ? parent.id() : null,
    updatedAt: Date.now(),
  } satisfies Pick<TElement, "id" | "x" | "y" | "parentGroupId" | "updatedAt">;
}

function findSceneNodeById(render: RenderService, id: string) {
  const node = render.staticForegroundLayer.findOne((candidate: Konva.Node) => {
    return (candidate instanceof render.Group || candidate instanceof render.Shape) && candidate.id() === id;
  });

  if (!(node instanceof render.Group) && !(node instanceof render.Shape)) {
    return null;
  }

  return node;
}

function applyElement(portal: TPenListenersPortal, element: TElement) {
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

function serializeNodeElements(portal: TPenListenersPortal, node: Konva.Node) {
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

function startMultiPenCloneDrag(portal: TPenListenersPortal, node: Konva.Path) {
  const selected = portal.filterSelection(portal.selection.selection);
  if (selected.length <= 1 || !selected.every(isPenNode) || !selected.includes(node)) {
    return false;
  }

  const entries = selected.map((sourceNode) => {
    const previewNode = portal.createPenPreviewClone(sourceNode);
    portal.render.dynamicLayer.add(previewNode);
    return { sourceNode, previewNode };
  });
  const leader = entries.find((entry) => entry.sourceNode === node);
  if (!leader) {
    entries.forEach((entry) => {
      entry.previewNode.destroy();
    });
    return false;
  }

  const startPositions = new Map(entries.map((entry) => [entry.previewNode.id(), { ...entry.previewNode.absolutePosition() }]));
  const handleDragMove = () => {
    const leaderStart = startPositions.get(leader.previewNode.id());
    if (!leaderStart) {
      return;
    }

    const current = leader.previewNode.absolutePosition();
    const dx = current.x - leaderStart.x;
    const dy = current.y - leaderStart.y;

    entries.forEach((entry) => {
      if (entry === leader) {
        return;
      }

      const start = startPositions.get(entry.previewNode.id());
      if (!start) {
        return;
      }

      entry.previewNode.absolutePosition({ x: start.x + dx, y: start.y + dy });
    });
  };

  const finalize = () => {
    leader.previewNode.off("dragmove", handleDragMove);
    leader.previewNode.off("dragend", finalize);

    const createdNodes = entries.map((entry) => {
      return portal.finalizePenPreviewClone(entry.previewNode);
    });

    portal.selection.setSelection(createdNodes);
    portal.selection.setFocusedNode(createdNodes[createdNodes.length - 1] ?? null);
  };

  leader.previewNode.on("dragmove", handleDragMove);
  leader.previewNode.on("dragend", finalize);
  leader.previewNode.startDrag();
  return true;
}

export function setupPenShapeListeners(portal: TPenListenersPortal, node: Konva.Path) {
  if (node.getAttr("vcPenNodeSetup") === true) {
    node.off("pointerclick pointerdown dragstart pointerdblclick dragmove dragend");
  }

  node.setAttr("vcPenNodeSetup", true);

  let originalElement: TElement | null = null;
  let isCloneDrag = false;
  const multiDragStartPositions = new Map<string, { x: number; y: number }>();
  const passengerOriginalElements = new Map<string, TElement[]>();
  const throttledPatch = throttle((patch: Pick<TElement, "id" | "x" | "y" | "parentGroupId" | "updatedAt">) => {
    portal.crdt.patch({ elements: [patch], groups: [] });
  }, 100);

  node.on("pointerclick", (event) => {
    if (portal.selection.mode !== "select") {
      return;
    }

    portal.hooks.elementPointerClick.call(event as TElementPointerEvent);
  });

  node.on("pointerdown dragstart", (event) => {
    if (portal.selection.mode !== "select") {
      portal.safeStopDrag(node);
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
      portal.safeStopDrag(node);
      if (startMultiPenCloneDrag(portal, node)) {
        return;
      }
      portal.createPenCloneDrag(node);
      return;
    }

    originalElement = portal.toElement(node);
    multiDragStartPositions.clear();
    passengerOriginalElements.clear();

    const selected = portal.filterSelection(portal.selection.selection);
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
    if (portal.selection.mode !== "select") {
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

    throttledPatch(penNodeToPositionPatch(portal.render, node));

    const selected = portal.filterSelection(portal.selection.selection);
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

    const nextElement = portal.toElement(node);
    const beforeElement = originalElement ? structuredClone(originalElement) : null;
    const afterElement = structuredClone(nextElement);
    portal.crdt.patch({ elements: [afterElement], groups: [] });

    const selected = portal.filterSelection(portal.selection.selection);
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
      label: "drag-pen",
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
