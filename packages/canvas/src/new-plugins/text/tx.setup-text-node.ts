import { fxToElement } from "./fx.to-element";
import { txUpdateTextNodeFromElement } from "./tx.update-text-node-from-element";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { IHooks } from "../../runtime";
import type Konva from "konva";

export type TPortalSetupTextNode = {
  crdt: CrdtService;
  history: HistoryService;
  hooks: IHooks;
  render: RenderService;
};

export type TArgsSetupTextNode = {
  freeTextName: string;
  node: Konva.Text;
};

export function txSetupTextNode(portal: TPortalSetupTextNode, args: TArgsSetupTextNode) {
  let beforeDragElement: TElement | null = null;

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

  args.node.on("dragstart", () => {
    const now = Date.now();
    beforeDragElement = fxToElement({ render: portal.render }, { node: args.node, createdAt: now, updatedAt: now });
  });

  args.node.on("dragend", () => {
    const now = Date.now();
    const afterDragElement = fxToElement({ render: portal.render }, { node: args.node, createdAt: beforeDragElement?.createdAt ?? now, updatedAt: now });
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
        txUpdateTextNodeFromElement({ render: portal.render }, { element: undoElement, freeTextName: args.freeTextName });
        portal.render.staticForegroundLayer.batchDraw();
        portal.crdt.patch({ elements: [undoElement], groups: [] });
      },
      redo: () => {
        txUpdateTextNodeFromElement({ render: portal.render }, { element: redoElement, freeTextName: args.freeTextName });
        portal.render.staticForegroundLayer.batchDraw();
        portal.crdt.patch({ elements: [redoElement], groups: [] });
      },
    });
  });
}
