import { fxToElement } from "./fx.to-element";
import { txUpdateTextNodeFromElement } from "./tx.update-text-node-from-element";
import type { ThemeService } from "@vibecanvas/service-theme";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { SceneService } from "../../new-services/scene/SceneService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import type { IHooks } from "../../runtime";
import type Konva from "konva";

export type TPortalSetupTextNode = {
  crdt: CrdtService;
  crypto: typeof crypto;
  history: HistoryService;
  editor: EditorService;
  hooks: IHooks;
  render: SceneService;
  selection: SelectionService;
  setupNode: (node: Konva.Text) => Konva.Text;
  theme: ThemeService;
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

  args.node.on("transform", () => {
    const scaleX = args.node.scaleX();
    const scaleY = args.node.scaleY();
    args.node.setAttrs({
      width: args.node.width() * scaleX,
      height: args.node.height() * scaleY,
      fontSize: Math.max(1, args.node.fontSize() * scaleX),
      scaleX: 1,
      scaleY: 1,
    });
  });

  args.node.on("dragstart", (event) => {
    if (event.evt?.altKey) {
      isCloneDrag = true;
      stopDragSafely(args.node);

      const previewClone = new portal.render.Text(args.node.getAttrs());
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
        const clonedElement = fxToElement(
          { editor: portal.editor, render: portal.render },
          { node: cloned, createdAt: now, updatedAt: now },
        );
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
    beforeDragElement = fxToElement({ editor: portal.editor, render: portal.render }, { node: args.node, createdAt: now, updatedAt: now });
  });

  args.node.on("dragend", () => {
    if (isCloneDrag) {
      isCloneDrag = false;
      beforeDragElement = null;
      return;
    }
    const now = Date.now();
    const afterDragElement = fxToElement({ editor: portal.editor, render: portal.render }, { node: args.node, createdAt: beforeDragElement?.createdAt ?? now, updatedAt: now });
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
        txUpdateTextNodeFromElement({ render: portal.render, theme: portal.theme }, { element: undoElement, freeTextName: args.freeTextName });
        portal.render.staticForegroundLayer.batchDraw();
        portal.crdt.patch({ elements: [undoElement], groups: [] });
      },
      redo: () => {
        txUpdateTextNodeFromElement({ render: portal.render, theme: portal.theme }, { element: redoElement, freeTextName: args.freeTextName });
        portal.render.staticForegroundLayer.batchDraw();
        portal.crdt.patch({ elements: [redoElement], groups: [] });
      },
    });
  });
}
