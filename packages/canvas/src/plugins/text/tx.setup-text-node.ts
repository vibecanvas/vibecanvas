import { txUpdateTextNodeFromElement } from "./tx.update-text-node-from-element";
import type { ThemeService } from "@vibecanvas/service-theme";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type { CrdtService } from "../../services/crdt/CrdtService";
import type { HistoryService } from "../../services/history/HistoryService";
import type { SceneService } from "../../services/scene/SceneService";
import type { SelectionService } from "../../services/selection/SelectionService";
import type { IHooks } from "../../runtime";
import type Konva from "konva";

export type TPortalSetupTextNode = {
  Konva: typeof Konva;
  crdt: CrdtService;
  crypto: typeof crypto;
  history: HistoryService;
  hooks: IHooks;
  render: SceneService;
  selection: SelectionService;
  serializeNode: (args: { node: Konva.Text; createdAt: number; updatedAt: number }) => TElement;
  setupNode: (node: Konva.Text) => Konva.Text;
  theme: ThemeService;
  createThrottledPatch: (callback: (element: TElement) => void) => (element: TElement) => void;
};

export type TArgsSetupTextNode = {
  freeTextName: string;
  node: Konva.Text;
};

function stopDragSafely(node: Konva.Node) {
  try {
    if (node.isDragging()) {
      node.stopDrag();
    }
  } catch {
    return;
  }
}

export function txSetupTextNode(portal: TPortalSetupTextNode, args: TArgsSetupTextNode) {
  let beforeDragElement: TElement | null = null;
  let isCloneDrag = false;
  const throttledPatch = portal.createThrottledPatch((element) => {
    portal.crdt.patch({ elements: [element], groups: [] });
  });

  args.node.on("pointerclick", (event) => {
    portal.hooks.elementPointerClick.call(event);
  });

  args.node.on("pointerdown", (event) => {
    const didHandle = portal.hooks.elementPointerDown.call(event);
    if (didHandle) {
      event.cancelBubble = true;
    }
  });

  args.node.on("pointerdblclick", (event) => {
    const didHandle = portal.hooks.elementPointerDoubleClick.call(event);
    if (didHandle) {
      event.cancelBubble = true;
    }
  });

  args.node.on("dragstart", (event) => {
    if (event.evt?.altKey) {
      isCloneDrag = true;
      stopDragSafely(args.node);

      const previewClone = new portal.Konva.Text(args.node.getAttrs());
      previewClone.id(portal.crypto.randomUUID());
      previewClone.name(args.freeTextName);
      previewClone.draggable(true);
      portal.render.dynamicLayer.add(previewClone);
      previewClone.startDrag();

      const finalizeCloneDrag = () => {
        previewClone.off("dragend", finalizeCloneDrag);
        stopDragSafely(previewClone);
        previewClone.moveTo(portal.render.staticForegroundLayer);
        const cloned = portal.setupNode(previewClone);
        const now = Date.now();
        const clonedElement = portal.serializeNode({
          node: cloned,
          createdAt: now,
          updatedAt: now,
        });
        portal.crdt.patch({ elements: [clonedElement], groups: [] });
        portal.selection.setSelection([cloned]);
        portal.selection.setFocusedNode(cloned);
        portal.render.dynamicLayer.batchDraw();
        portal.render.staticForegroundLayer.batchDraw();
      };

      previewClone.on("dragend", finalizeCloneDrag);
      return;
    }

    const now = Date.now();
    beforeDragElement = portal.serializeNode({ node: args.node, createdAt: now, updatedAt: now });
  });

  args.node.on("dragmove", () => {
    if (isCloneDrag) {
      return;
    }

    const now = Date.now();
    throttledPatch(portal.serializeNode({
      node: args.node,
      createdAt: beforeDragElement?.createdAt ?? now,
      updatedAt: now,
    }));
  });

  args.node.on("dragend", () => {
    if (isCloneDrag) {
      isCloneDrag = false;
      beforeDragElement = null;
      return;
    }
    const now = Date.now();
    const afterDragElement = portal.serializeNode({
      node: args.node,
      createdAt: beforeDragElement?.createdAt ?? now,
      updatedAt: now,
    });
    portal.crdt.patch({ elements: [afterDragElement], groups: [] });

    if (!beforeDragElement) {
      return;
    }

    const didMove = beforeDragElement.x !== afterDragElement.x || beforeDragElement.y !== afterDragElement.y;
    if (!didMove) {
      beforeDragElement = null;
      return;
    }

    const undoElement = structuredClone(beforeDragElement);
    const redoElement = structuredClone(afterDragElement);
    beforeDragElement = null;

    portal.history.record({
      label: "drag-text",
      undo: () => {
        txUpdateTextNodeFromElement({ Konva: portal.Konva, scene: portal.render, theme: portal.theme }, { element: undoElement, freeTextName: args.freeTextName });
        portal.render.staticForegroundLayer.batchDraw();
        portal.crdt.patch({ elements: [undoElement], groups: [] });
      },
      redo: () => {
        txUpdateTextNodeFromElement({ Konva: portal.Konva, scene: portal.render, theme: portal.theme }, { element: redoElement, freeTextName: args.freeTextName });
        portal.render.staticForegroundLayer.batchDraw();
        portal.crdt.patch({ elements: [redoElement], groups: [] });
      },
    });
  });
}
