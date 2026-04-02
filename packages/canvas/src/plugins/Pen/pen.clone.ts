import Konva from "konva";
import type { IPluginContext } from "../shared/interface";
import { createPenPathFromElement, penPathToElement } from "./pen.element";
import { setupPenShapeListeners } from "./pen.listeners";

export function createPenPreviewClone(node: Konva.Path) {
  const element = penPathToElement(node);
  const clone = createPenPathFromElement({
    ...element,
    id: crypto.randomUUID(),
    parentGroupId: null,
    data: structuredClone(element.data),
    style: structuredClone(element.style),
  });

  clone.setDraggable(true);
  return clone;
}

export function createPenCloneDrag(context: IPluginContext, node: Konva.Path) {
  const previewClone = createPenPreviewClone(node);
  context.dynamicLayer.add(previewClone);
  previewClone.startDrag();

  const finalizeCloneDrag = () => {
    previewClone.off("dragend", finalizeCloneDrag);
    const cloned = finalizePenPreviewClone(context, previewClone);
    context.setState("selection", cloned ? [cloned] : []);
  };

  previewClone.on("dragend", finalizeCloneDrag);
  return previewClone;
}

export function finalizePenPreviewClone(context: IPluginContext, previewClone: Konva.Path) {
  if (previewClone.isDragging()) {
    previewClone.stopDrag();
  }

  previewClone.moveTo(context.staticForegroundLayer);
  setupPenShapeListeners(context, previewClone);
  previewClone.setDraggable(true);
  context.capabilities.renderOrder?.assignOrderOnInsert({
    parent: context.staticForegroundLayer,
    nodes: [previewClone],
    position: "front",
  });
  context.crdt.patch({ elements: [penPathToElement(previewClone)], groups: [] });
  return previewClone;
}
