import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { RenderOrderService } from "../../new-services/render-order/RenderOrderService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import type { TThemeDefinition } from "@vibecanvas/service-theme";
import type { IHooks, TElementPointerEvent } from "../../runtime";
import { fxGetCanvasAncestorGroups, fxGetCanvasNodeKind, fxIsCanvasGroupNode } from "../../core/fn.canvas-node-semantics";
import { fxFilterSelection } from "../../core/fn.filter-selection";
import { fxSerializeSubtreeElements } from "../group/fn.serialize-subtree-elements";
import { type TShape1dNode } from "./CONSTANTS";
import { fxToPositionPatch, fxToTElement } from "./fx.node";
import { txCreatePreviewClone } from "./tx.element";
import { txRecordCreateHistory, type TPortalTxRecordShape1dHistory } from "./tx.history";

export type TPortalTxSafeStopDrag = {};
export type TArgsTxSafeStopDrag = { node: Konva.Node };
export function txSafeStopDrag(portal: TPortalTxSafeStopDrag, args: TArgsTxSafeStopDrag) {
  void portal;
  try {
    if (args.node.isDragging()) {
      args.node.stopDrag();
    }
  } catch {
    return;
  }
}

export type TPortalTxShape1dRuntime = TPortalTxRecordShape1dHistory & {
  hooks: IHooks;
  theme: { getTheme(): string | TThemeDefinition };
  createId: () => string;
  now: () => number;
  createThrottledPatch: (callback: (patch: Pick<TElement, "id" | "x" | "y" | "parentGroupId" | "updatedAt">) => void) => (patch: Pick<TElement, "id" | "x" | "y" | "parentGroupId" | "updatedAt">) => void;
};
export type TArgsTxSetupShapeListeners = { node: TShape1dNode };

function findSceneNodeById(portal: TPortalTxShape1dRuntime, id: string) {
  const node = portal.render.staticForegroundLayer.findOne((candidate: Konva.Node) => {
    return (candidate instanceof portal.render.Group || candidate instanceof portal.render.Shape) && candidate.id() === id;
  });

  if (!(node instanceof portal.render.Group) && !(node instanceof portal.render.Shape)) {
    return null;
  }

  return node;
}

function applyElement(portal: TPortalTxShape1dRuntime, element: TElement) {
  const didUpdate = portal.editor.updateShapeFromTElement(element);
  if (!didUpdate) {
    return;
  }

  fxGetCanvasAncestorGroups({ editor: portal.editor, node: findSceneNodeById(portal, element.id) }).forEach((group) => {
    group.fire("transform");
  });
}

function serializeNodeElements(portal: TPortalTxShape1dRuntime, node: Konva.Node) {
  const kind = fxGetCanvasNodeKind({ editor: portal.editor, node });
  if (kind === "element") {
    const element = portal.editor.toElement(node);
    return element ? [structuredClone(element)] : [];
  }

  if (kind === "group" && fxIsCanvasGroupNode({ editor: portal.editor, node })) {
    return fxSerializeSubtreeElements({ editor: portal.editor, render: portal.render, group: node as Konva.Group }).map((element) => structuredClone(element));
  }

  return [] as TElement[];
}

export type TArgsTxFinalizePreviewClone = { previewClone: TShape1dNode };
export function txFinalizePreviewClone(portal: TPortalTxShape1dRuntime, args: TArgsTxFinalizePreviewClone) {
  if (args.previewClone.isDragging()) {
    args.previewClone.stopDrag();
  }

  args.previewClone.moveTo(portal.render.staticForegroundLayer);
  portal.setupNode(args.previewClone);
  args.previewClone.setDraggable(true);
  portal.renderOrder.assignOrderOnInsert({ parent: portal.render.staticForegroundLayer, nodes: [args.previewClone], position: "front" });

  const createdElement = fxToTElement({ editor: portal.editor, now: portal.now }, { node: args.previewClone });
  portal.crdt.patch({ elements: [createdElement], groups: [] });
  txRecordCreateHistory(portal, { element: createdElement, node: args.previewClone, label: "clone-shape1d" });
  portal.render.dynamicLayer.batchDraw();
  portal.render.staticForegroundLayer.batchDraw();
  return args.previewClone;
}

export type TArgsTxCreateCloneDrag = { node: TShape1dNode };
export function txCreateCloneDrag(portal: TPortalTxShape1dRuntime, args: TArgsTxCreateCloneDrag) {
  const previewClone = txCreatePreviewClone({
    createId: portal.createId,
    now: portal.now,
    editor: portal.editor,
    theme: portal.theme,
    resolveThemeColor: portal.resolveThemeColor,
    createShapeNode: portal.createShapeNode,
    setNodeZIndex: portal.setNodeZIndex,
  }, { node: args.node });
  portal.render.dynamicLayer.add(previewClone);
  previewClone.startDrag();

  const finalizeCloneDrag = () => {
    previewClone.off("dragend", finalizeCloneDrag);
    const cloned = txFinalizePreviewClone(portal, { previewClone });
    portal.selection.setSelection(cloned ? [cloned] : []);
    portal.selection.setFocusedNode(cloned);
  };

  previewClone.on("dragend", finalizeCloneDrag);
  return previewClone;
}

export function txSetupShapeListeners(portal: TPortalTxShape1dRuntime, args: TArgsTxSetupShapeListeners) {
  if (args.node.getAttr("vcShape1dNodeSetup") === true) {
    args.node.off("pointerclick pointerdown dragstart pointerdblclick dragmove dragend");
  }

  args.node.setAttr("vcShape1dNodeSetup", true);
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
    if (portal.selection.mode !== "select" || portal.editor.editingShape1dId === args.node.id()) {
      txSafeStopDrag({}, { node: args.node });
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
      txSafeStopDrag({}, { node: args.node });
      txCreateCloneDrag(portal, { node: args.node });
      return;
    }

    originalElement = fxToTElement({ editor: portal.editor, now: portal.now }, { node: args.node });
    multiDragStartPositions.clear();
    passengerOriginalElements.clear();

    const selected = fxFilterSelection({ render: portal.render, editor: portal.editor, selection: portal.selection.selection });
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
    if (portal.selection.selection.length === 0) {
      portal.selection.setSelection([args.node]);
      portal.selection.setFocusedNode(args.node);
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
    throttledPatch(fxToPositionPatch({ editor: portal.editor, now: portal.now }, { node: args.node }));
    const selected = fxFilterSelection({ render: portal.render, editor: portal.editor, selection: portal.selection.selection });
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

    const nextElement = fxToTElement({ editor: portal.editor, now: portal.now }, { node: args.node });
    const beforeElement = originalElement ? structuredClone(originalElement) : null;
    const afterElement = structuredClone(nextElement);
    portal.crdt.patch({ elements: [afterElement], groups: [] });

    const selected = fxFilterSelection({ render: portal.render, editor: portal.editor, selection: portal.selection.selection });
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
