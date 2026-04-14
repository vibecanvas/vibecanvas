import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { SceneService } from "../../new-services/scene/SceneService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import type { IHooks, TElementPointerEvent } from "../../runtime";
import { fxGetCanvasAncestorGroups } from "../../core/fx.canvas-node-semantics";
import { txCreateImageCloneDrag } from "./tx.create-image-clone-drag";
import type { TPortalCreateImageCloneDrag } from "./tx.create-image-clone-drag";
import { txUpdateImageNodeFromElement } from "./tx.update-image-node-from-element";
import type { TPortalUpdateImageNodeFromElement } from "./tx.update-image-node-from-element";

export type TPortalSetupImageListeners = {
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  render: SceneService;
  selection: SelectionService;
  hooks: IHooks;
  cloneDragPortal: TPortalCreateImageCloneDrag;
  updateImageNodeFromElementPortal: TPortalUpdateImageNodeFromElement;
  filterSelection: (selection: Konva.Node[]) => Konva.Node[];
  safeStopDrag: (node: Konva.Node) => void;
  toElement: (node: Konva.Image) => TElement;
  createThrottledPatch: (node: Konva.Image) => (element: TElement) => void;
};

export type TArgsSetupImageListeners = {
  node: Konva.Image;
};

export function txSetupImageListeners(
  portal: TPortalSetupImageListeners,
  args: TArgsSetupImageListeners,
) {
  let originalElement: TElement | null = null;
  let isCloneDrag = false;
  const multiDragStartPositions = new Map<string, { x: number; y: number }>();
  const passengerOriginalElements = new Map<string, TElement[]>();

  const applyElement = (element: TElement) => {
    txUpdateImageNodeFromElement(portal.updateImageNodeFromElementPortal, {
      node: args.node,
      element,
    });

    fxGetCanvasAncestorGroups({}, {
      editor: portal.editor,
      node: args.node,
    }).forEach((group) => {
      group.fire("transform");
    });
  };

  const throttledPatch = portal.createThrottledPatch(args.node);

  args.node.off("pointerclick pointerdown dragstart pointerdblclick dragmove dragend");

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
    }

    if (event.type === "dragstart" && event.evt.altKey) {
      isCloneDrag = true;
      portal.safeStopDrag(args.node);
      txCreateImageCloneDrag(portal.cloneDragPortal, { node: args.node });
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

      const element = portal.editor.toElement(selectedNode);
      if (element) {
        passengerOriginalElements.set(selectedNode.id(), [structuredClone(element)]);
      }
    });
  });

  args.node.on("dragmove", () => {
    if (isCloneDrag) {
      return;
    }

    throttledPatch(portal.toElement(args.node));

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

    passengers.forEach((passenger) => {
      const element = portal.editor.toElement(passenger);
      if (!element) {
        return;
      }

      const elements = [structuredClone(element)];
      passengerAfterElements.set(passenger.id(), elements);
      portal.crdt.patch({ elements, groups: [] });
    });

    const capturedStartPositions = new Map(multiDragStartPositions);
    const capturedPassengerOriginals = new Map(passengerOriginalElements);
    multiDragStartPositions.clear();
    originalElement = null;

    if (!beforeElement) {
      return;
    }

    const didMove = beforeElement.x !== afterElement.x || beforeElement.y !== afterElement.y;
    if (!didMove) {
      return;
    }

    portal.history.record({
      label: "drag-image",
      undo() {
        applyElement(beforeElement);
        portal.crdt.patch({ elements: [beforeElement], groups: [] });
        passengers.forEach((passenger) => {
          const startPos = capturedStartPositions.get(passenger.id());
          if (startPos) {
            passenger.absolutePosition(startPos);
          }

          const originalEls = capturedPassengerOriginals.get(passenger.id());
          if (originalEls && originalEls.length > 0) {
            portal.crdt.patch({ elements: originalEls, groups: [] });
          }
        });
      },
      redo() {
        applyElement(afterElement);
        portal.crdt.patch({ elements: [afterElement], groups: [] });
        passengers.forEach((passenger) => {
          const afterEls = passengerAfterElements.get(passenger.id());
          if (!afterEls || afterEls.length === 0) {
            return;
          }

          portal.editor.updateShapeFromTElement(afterEls[0]);
          portal.crdt.patch({ elements: afterEls, groups: [] });
        });
      },
    });
  });
}
