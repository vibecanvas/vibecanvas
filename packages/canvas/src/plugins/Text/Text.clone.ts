import Konva from "konva";
import type { IPluginContext } from "../shared/interface";
import type { toTElement as toTElementType } from "./Text.serialization";

type FinalizePreviewCloneDeps = {
  setupShapeListeners: (context: IPluginContext, node: Konva.Text) => void;
  toTElement: typeof toTElementType;
};

type CreateCloneDragDeps = {
  createPreviewClone: (node: Konva.Text) => Konva.Text;
  finalizePreviewClone: (context: IPluginContext, previewClone: Konva.Text) => Konva.Text;
};

export function createPreviewClone(node: Konva.Text) {
  const clone = new Konva.Text(node.getAttrs());
  clone.id(crypto.randomUUID());
  clone.setDraggable(true);
  return clone;
}

export function finalizePreviewClone(
  context: IPluginContext,
  previewClone: Konva.Text,
  deps: FinalizePreviewCloneDeps,
) {
  if (previewClone.isDragging()) {
    previewClone.stopDrag();
  }
  previewClone.moveTo(context.staticForegroundLayer);
  deps.setupShapeListeners(context, previewClone);
  previewClone.setDraggable(true);
  context.crdt.patch({ elements: [deps.toTElement(previewClone)], groups: [] });
  return previewClone;
}

export function createCloneDrag(
  context: IPluginContext,
  node: Konva.Text,
  deps: CreateCloneDragDeps,
) {
  const previewClone = deps.createPreviewClone(node);
  context.dynamicLayer.add(previewClone);
  previewClone.startDrag();
  const finalizeCloneDrag = () => {
    previewClone.off('dragend', finalizeCloneDrag);
    const cloned = deps.finalizePreviewClone(context, previewClone);
    context.setState('selection', cloned ? [cloned] : []);
  };
  previewClone.on('dragend', finalizeCloneDrag);
  return previewClone;
}

export function safeStopDrag(node: Konva.Node) {
  try {
    if (node.isDragging()) {
      node.stopDrag();
    }
  } catch {
    return;
  }
}
