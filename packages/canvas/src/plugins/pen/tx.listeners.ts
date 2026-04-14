import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { CrdtService } from "../../services/crdt/CrdtService";
import type { EditorService } from "../../services/editor/EditorService";
import type { HistoryService } from "../../services/history/HistoryService";
import type { SceneService } from "../../services/scene/SceneService";
import type { SelectionService } from "../../services/selection/SelectionService";
import type { IHooks, TElementPointerEvent } from "../../runtime";
import { fxGetCanvasAncestorGroups, fxGetCanvasNodeKind, fxGetCanvasParentGroupId, fxIsCanvasGroupNode } from "../../core/fx.canvas-node-semantics";
import { fxIsPenNode } from "./fx.path";
import { fxSerializeSubtreeElements } from "../group/fn.serialize-subtree-elements";

export type TPortalTxSafeStopPenDrag = {};
export type TArgsTxSafeStopPenDrag = {
  node: Konva.Node;
};

export function txSafeStopPenDrag(portal: TPortalTxSafeStopPenDrag, args: TArgsTxSafeStopPenDrag) {
  void portal;
  try {
    if (args.node.isDragging()) {
      args.node.stopDrag();
    }
  } catch {
    return;
  }
}

type TThrottlePatch = (patch: Pick<TElement, "id" | "x" | "y" | "parentGroupId" | "updatedAt">) => void;

export type TPortalTxSetupPenShapeListeners = {
  Group: typeof Konva.Group;
  Shape: typeof Konva.Shape;
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  render: SceneService;
  selection: SelectionService;
  hooks: IHooks;
  now: () => number;
  Path: typeof Konva.Path;
  getWorldPosition: (node: Konva.Path) => { x: number; y: number };
  createThrottledPatch: (callback: TThrottlePatch) => TThrottlePatch;
  createPenCloneDrag: (node: Konva.Path) => Konva.Path;
  createPenPreviewClone: (node: Konva.Path) => Konva.Path;
  finalizePenPreviewClone: (node: Konva.Path) => Konva.Path;
  filterSelection: (selection: Konva.Node[]) => Konva.Node[];
  safeStopDrag: (node: Konva.Node) => void;
  toElement: (node: Konva.Path) => TElement;
};
export type TArgsTxSetupPenShapeListeners = {
  node: Konva.Path;
};

function penNodeToPositionPatch(portal: TPortalTxSetupPenShapeListeners, node: Konva.Path) {
  const worldPosition = portal.getWorldPosition(node);

  return {
    id: node.id(),
    x: worldPosition.x,
    y: worldPosition.y,
    parentGroupId: fxGetCanvasParentGroupId({}, { editor: portal.editor, node }),
    updatedAt: portal.now(),
  } satisfies Pick<TElement, "id" | "x" | "y" | "parentGroupId" | "updatedAt">;
}

function findSceneNodeById(portal: TPortalTxSetupPenShapeListeners, id: string) {
  const node = portal.render.staticForegroundLayer.findOne((candidate: Konva.Node) => {
    return (candidate instanceof portal.Group || candidate instanceof portal.Shape) && candidate.id() === id;
  });

  if (!(node instanceof portal.Group) && !(node instanceof portal.Shape)) {
    return null;
  }

  return node;
}

function applyElement(portal: TPortalTxSetupPenShapeListeners, element: TElement) {
  const didUpdate = portal.editor.updateShapeFromTElement(element);
  if (!didUpdate) {
    return;
  }

  fxGetCanvasAncestorGroups({}, {
    editor: portal.editor,
    node: findSceneNodeById(portal, element.id),
  }).forEach((group) => {
    group.fire("transform");
  });
}

function serializeNodeElements(portal: TPortalTxSetupPenShapeListeners, node: Konva.Node) {
  const kind = fxGetCanvasNodeKind({}, { editor: portal.editor, node });
  if (kind === "element") {
    const element = portal.editor.toElement(node);
    return element ? [structuredClone(element)] : [];
  }

  if (kind === "group" && fxIsCanvasGroupNode({}, { editor: portal.editor, node })) {
    return fxSerializeSubtreeElements({
      editor: portal.editor,
      Shape: portal.Shape,
      group: node as Konva.Group,
    }).map((element) => structuredClone(element));
  }

  return [] as TElement[];
}

function startMultiPenCloneDrag(portal: TPortalTxSetupPenShapeListeners, node: Konva.Path) {
  const selected = portal.filterSelection(portal.selection.selection);
  if (selected.length <= 1 || !selected.every((selectedNode) => fxIsPenNode({ Path: portal.Path }, { node: selectedNode })) || !selected.includes(node)) {
    return false;
  }

  const entries = selected.map((sourceNode) => {
    const previewNode = portal.createPenPreviewClone(sourceNode as Konva.Path);
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

export function txSetupPenShapeListeners(portal: TPortalTxSetupPenShapeListeners, args: TArgsTxSetupPenShapeListeners) {
  if (args.node.getAttr("vcPenNodeSetup") === true) {
    args.node.off("pointerclick pointerdown dragstart pointerdblclick dragmove dragend");
  }

  args.node.setAttr("vcPenNodeSetup", true);

  let originalElement: TElement | null = null;
  let isCloneDrag = false;
  const multiDragStartPositions = new Map<string, { x: number; y: number }>();
  const passengerOriginalElements = new Map<string, TElement[]>();
  const throttledPatch = portal.createThrottledPatch((patch) => {
    portal.crdt.patch({ elements: [patch], groups: [] });
  });

  args.node.on("pointerclick", (event) => {
    if (portal.selection.mode !== "select") {
      return;
    }

    portal.hooks.elementPointerClick.call(event as TElementPointerEvent);
  });

  args.node.on("pointerdown dragstart", (event) => {
    if (portal.selection.mode !== "select") {
      portal.safeStopDrag(args.node);
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
      portal.safeStopDrag(args.node);
      if (startMultiPenCloneDrag(portal, args.node)) {
        return;
      }
      portal.createPenCloneDrag(args.node);
      return;
    }

    originalElement = portal.toElement(args.node);
    multiDragStartPositions.clear();
    passengerOriginalElements.clear();

    const selected = portal.filterSelection(portal.selection.selection);
    selected.forEach((selectedNode) => {
      multiDragStartPositions.set(selectedNode.id(), { ...selectedNode.absolutePosition() });
      if (selectedNode === args.node) {
        return;
      }

      const elements = serializeNodeElements(portal, selectedNode);
      if (elements.length > 0) {
        passengerOriginalElements.set(selectedNode.id(), elements);
      }
    });
  });

  args.node.on("pointerdblclick", (event) => {
    if (portal.selection.mode !== "select") {
      return;
    }

    const earlyExit = portal.hooks.elementPointerDoubleClick.call(event as TElementPointerEvent);
    if (earlyExit) {
      event.cancelBubble = true;
    }
  });

  args.node.on("dragmove", () => {
    if (isCloneDrag) {
      return;
    }

    throttledPatch(penNodeToPositionPatch(portal, args.node));

    const selected = portal.filterSelection(portal.selection.selection);
    if (selected.length <= 1) {
      return;
    }

    const start = multiDragStartPositions.get(args.node.id());
    if (!start) {
      return;
    }

    const current = args.node.absolutePosition();
    const dx = current.x - start.x;
    const dy = current.y - start.y;

    selected.forEach((other) => {
      if (other === args.node || other.isDragging()) {
        return;
      }

      const otherStart = multiDragStartPositions.get(other.id());
      if (!otherStart) {
        return;
      }

      other.absolutePosition({ x: otherStart.x + dx, y: otherStart.y + dy });
    });
  });

  args.node.on("dragend", () => {
    if (isCloneDrag) {
      isCloneDrag = false;
      originalElement = null;
      multiDragStartPositions.clear();
      passengerOriginalElements.clear();
      return;
    }

    const nextElement = portal.toElement(args.node);
    const beforeElement = originalElement ? structuredClone(originalElement) : null;
    const afterElement = structuredClone(nextElement);
    portal.crdt.patch({ elements: [afterElement], groups: [] });

    const selected = portal.filterSelection(portal.selection.selection);
    const passengers = selected.filter((selectedNode) => selectedNode !== args.node);
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
