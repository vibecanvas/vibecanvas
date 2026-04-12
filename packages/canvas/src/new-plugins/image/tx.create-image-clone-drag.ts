import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { RenderOrderService } from "../../new-services/render-order/RenderOrderService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import { txCloneBackendFileForElement } from "./tx.clone-backend-file-for-element";
import type { TPortalCloneBackendFileForElement } from "./tx.clone-backend-file-for-element";

export type TPortalCreateImageCloneDrag = {
  cloneBackendFileForElementPortal: TPortalCloneBackendFileForElement;
  crdt: CrdtService;
  history: HistoryService;
  render: RenderService;
  renderOrder: RenderOrderService;
  selection: SelectionService;
  createPreviewClone: (node: Konva.Image) => Konva.Image;
  createImageNode: (element: TElement) => Konva.Image;
  setupNode: (node: Konva.Image) => Konva.Image;
  toElement: (node: Konva.Image) => TElement;
  now: () => number;
};

export type TArgsCreateImageCloneDrag = {
  node: Konva.Image;
};

export function txCreateImageCloneDrag(
  portal: TPortalCreateImageCloneDrag,
  args: TArgsCreateImageCloneDrag,
) {
  const previewClone = portal.createPreviewClone(args.node);
  portal.render.dynamicLayer.add(previewClone);
  previewClone.startDrag();

  const finalizeCloneDrag = () => {
    previewClone.off("dragend", finalizeCloneDrag);
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

    const element = portal.toElement(previewClone);
    portal.crdt.patch({ elements: [element], groups: [] });
    txCloneBackendFileForElement(portal.cloneBackendFileForElementPortal, {
      element,
      now: portal.now(),
    });

    portal.history.record({
      label: "clone-image",
      undo() {
        previewClone.destroy();
        portal.crdt.deleteById({ elementIds: [element.id] });
        portal.selection.clear();
        portal.render.staticForegroundLayer.batchDraw();
      },
      redo() {
        const recreated = portal.setupNode(portal.createImageNode(element));
        recreated.setDraggable(true);
        portal.render.staticForegroundLayer.add(recreated);
        portal.renderOrder.setNodeZIndex(recreated, element.zIndex);
        portal.renderOrder.sortChildren(portal.render.staticForegroundLayer);
        portal.crdt.patch({ elements: [element], groups: [] });
        portal.selection.setSelection([recreated]);
        portal.selection.setFocusedNode(recreated);
        portal.render.staticForegroundLayer.batchDraw();
      },
    });

    portal.selection.setSelection([previewClone]);
    portal.selection.setFocusedNode(previewClone);
  };

  previewClone.on("dragend", finalizeCloneDrag);
  return previewClone;
}
