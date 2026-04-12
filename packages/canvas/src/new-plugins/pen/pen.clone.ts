import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { RenderOrderService } from "../../new-services/render-order/RenderOrderService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import { createPenPathFromElement } from "./pen.element";

export type TPenClonePortal = {
  crdt: CrdtService;
  render: RenderService;
  renderOrder: RenderOrderService;
  selection: SelectionService;
  createId: () => string;
  now: () => number;
  setupNode: (node: Konva.Path) => Konva.Path;
  toElement: (node: Konva.Path) => TElement;
};

export function createPenPreviewClone(portal: TPenClonePortal, node: Konva.Path) {
  const element = portal.toElement(node);
  const now = portal.now();
  const clone = createPenPathFromElement(portal.render, {
    ...element,
    id: portal.createId(),
    parentGroupId: null,
    createdAt: now,
    updatedAt: now,
    data: structuredClone(element.data),
    style: structuredClone(element.style),
    zIndex: "",
  });

  clone.setDraggable(true);
  return clone;
}

export function finalizePenPreviewClone(portal: TPenClonePortal, previewClone: Konva.Path) {
  if (previewClone.isDragging()) {
    previewClone.stopDrag();
  }

  previewClone.moveTo(portal.render.staticForegroundLayer);
  portal.setupNode(previewClone);
  previewClone.setDraggable(true);
  previewClone.listening(true);
  previewClone.visible(true);
  portal.renderOrder.assignOrderOnInsert({
    parent: portal.render.staticForegroundLayer,
    nodes: [previewClone],
    position: "front",
  });

  const element = portal.toElement(previewClone);
  portal.crdt.patch({ elements: [element], groups: [] });
  portal.render.dynamicLayer.batchDraw();
  portal.render.staticForegroundLayer.batchDraw();
  return previewClone;
}

export function createPenCloneDrag(portal: TPenClonePortal, node: Konva.Path) {
  const previewClone = createPenPreviewClone(portal, node);
  portal.render.dynamicLayer.add(previewClone);
  previewClone.startDrag();

  const finalizeCloneDrag = () => {
    previewClone.off("dragend", finalizeCloneDrag);
    const cloned = finalizePenPreviewClone(portal, previewClone);
    portal.selection.setSelection([cloned]);
    portal.selection.setFocusedNode(cloned);
  };

  previewClone.on("dragend", finalizeCloneDrag);
  return previewClone;
}
