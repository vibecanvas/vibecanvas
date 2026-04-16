import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import { fxGetCanvasAncestorGroups, fxGetCanvasNodeKind, fxIsCanvasGroupNode } from "../../core/fx.canvas-node-semantics";
import type { IRuntimeHooks, TElementPointerEvent } from "../../runtime";
import type { CanvasRegistryService } from "../../services/canvas-registry/CanvasRegistryService";
import type { CrdtService } from "../../services/crdt/CrdtService";
import type { HistoryService } from "../../services/history/HistoryService";
import type { SceneService } from "../../services/scene/SceneService";
import type { SelectionService } from "../../services/selection/SelectionService";
import { fxSerializeSubtreeElements } from "../group/fn.serialize-subtree-elements";

export type TPortalSetupShape2dNode = {
  Group: typeof Konva.Group;
  Shape: typeof Konva.Shape;
  canvasRegistry: CanvasRegistryService;
  crdt: CrdtService;
  history: HistoryService;
  render: SceneService;
  selection: SelectionService;
  hooks: IRuntimeHooks;
  createCloneDrag: (node: Konva.Shape) => Konva.Shape | null;
  filterSelection: (selection: Konva.Node[]) => Konva.Node[];
  safeStopDrag: (node: Konva.Node) => void;
  toElement: (node: Konva.Node) => TElement | null;
  createThrottledPatch: () => (element: TElement) => void;
  onNodeDragMove?: (node: Konva.Shape) => void;
  onNodeDragEnd?: (node: Konva.Shape) => void;
  onNodeTransform?: (node: Konva.Shape) => void;
};

export type TArgsSetupShape2dNode = {
  node: Konva.Shape;
};

function findSceneNodeById(portal: TPortalSetupShape2dNode, id: string) {
  const node = portal.render.staticForegroundLayer.findOne((candidate: Konva.Node) => {
    return (candidate instanceof portal.Group || candidate instanceof portal.Shape) && candidate.id() === id;
  });

  if (!(node instanceof portal.Group) && !(node instanceof portal.Shape)) {
    return null;
  }

  return node;
}

function applyElement(portal: TPortalSetupShape2dNode, element: TElement) {
  const didUpdate = portal.canvasRegistry.updateElement(element);
  if (!didUpdate) {
    return;
  }

  fxGetCanvasAncestorGroups({}, {
    editor: portal.canvasRegistry,
    node: findSceneNodeById(portal, element.id),
  }).forEach((group) => {
    group.fire("transform");
  });
}

function serializeNodeElements(portal: TPortalSetupShape2dNode, node: Konva.Node) {
  const kind = fxGetCanvasNodeKind({}, { editor: portal.canvasRegistry, node });
  if (kind === "element") {
    const element = portal.canvasRegistry.toElement(node);
    return element ? [structuredClone(element)] : [];
  }

  if (kind === "group" && fxIsCanvasGroupNode({}, { editor: portal.canvasRegistry, node })) {
    return fxSerializeSubtreeElements({
      canvasRegistry: portal.canvasRegistry,
      Shape: portal.Shape,
      group: node as Konva.Group,
    }).map((element) => structuredClone(element));
  }

  return [] as TElement[];
}

export function txSetupShape2dNode(
  portal: TPortalSetupShape2dNode,
  args: TArgsSetupShape2dNode,
) {
  if (args.node.getAttr("vcShape2dNodeSetup") === true) {
    args.node.off("pointerclick pointerdown dragstart pointerdblclick dragmove dragend transform");
  }

  args.node.setAttr("vcShape2dNodeSetup", true);
  args.node.draggable(true);
  args.node.listening(true);

  let originalElement: TElement | null = null;
  let isCloneDrag = false;
  const multiDragStartPositions = new Map<string, { x: number; y: number }>();
  const passengerOriginalElements = new Map<string, TElement[]>();
  const throttledPatch = portal.createThrottledPatch();

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
      portal.createCloneDrag(args.node);
    }
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

  args.node.on("dragstart", () => {
    if (isCloneDrag) {
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

  args.node.on("dragmove", () => {
    if (isCloneDrag) {
      return;
    }

    const element = portal.toElement(args.node);
    if (element) {
      throttledPatch(element);
    }
    portal.onNodeDragMove?.(args.node);

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

  args.node.on("transform", () => {
    portal.onNodeTransform?.(args.node);
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
    portal.onNodeDragEnd?.(args.node);
    if (!nextElement) {
      originalElement = null;
      multiDragStartPositions.clear();
      passengerOriginalElements.clear();
      return;
    }

    const beforeElement = originalElement ? structuredClone(originalElement) : null;
    const afterElement = structuredClone(nextElement);

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
    });

    const dragBuilder = portal.crdt.build();
    dragBuilder.patchElement(afterElement.id, afterElement);
    passengerAfterElements.forEach((elements) => {
      elements.forEach((element) => {
        dragBuilder.patchElement(element.id, element);
      });
    });
    const dragCommitResult = dragBuilder.commit();

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
      label: "drag-shape2d",
      undo() {
        applyElement(portal, beforeElement);
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
        });
        dragCommitResult.rollback();
      },
      redo() {
        applyElement(portal, afterElement);
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
        });
        portal.crdt.applyOps({ ops: dragCommitResult.redoOps });
      },
    });
  });

  return args.node;
}
