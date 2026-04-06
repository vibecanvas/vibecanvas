import type { TElement } from "@vibecanvas/automerge-service/types/canvas-doc";
import Konva from "konva";
import { setNodeZIndex } from "../shared/render-order.shared";
import type { IPluginContext } from "../shared/interface";

export function finalizePreviewClone(
  runtime: {
    context: IPluginContext;
    setupImageListeners: (context: IPluginContext, node: Konva.Image) => void;
    toTElement: (node: Konva.Image) => TElement;
    cloneBackendFileForElement: (context: IPluginContext, element: TElement, errorTitle?: string) => void;
    createImageNode: (element: TElement) => Konva.Image;
  },
  payload: { previewClone: Konva.Image },
) {
  if (payload.previewClone.isDragging()) {
    payload.previewClone.stopDrag();
  }

  payload.previewClone.moveTo(runtime.context.staticForegroundLayer);
  runtime.setupImageListeners(runtime.context, payload.previewClone);
  payload.previewClone.setDraggable(true);
  runtime.context.capabilities.renderOrder?.assignOrderOnInsert({
    parent: runtime.context.staticForegroundLayer,
    nodes: [payload.previewClone],
    position: "front",
  });

  const element = runtime.toTElement(payload.previewClone);
  runtime.context.crdt.patch({ elements: [element], groups: [] });
  runtime.cloneBackendFileForElement(runtime.context, element);
  runtime.context.history.record({
    label: "clone-image",
    undo() {
      payload.previewClone.destroy();
      runtime.context.crdt.deleteById({ elementIds: [element.id] });
      runtime.context.setState("selection", []);
    },
    redo() {
      const recreated = runtime.createImageNode(element);
      runtime.setupImageListeners(runtime.context, recreated);
      recreated.setDraggable(true);
      runtime.context.staticForegroundLayer.add(recreated);
      setNodeZIndex(recreated, element.zIndex);
      runtime.context.capabilities.renderOrder?.sortChildren(runtime.context.staticForegroundLayer);
      runtime.context.crdt.patch({ elements: [element], groups: [] });
      runtime.context.setState("selection", [recreated]);
    },
  });
  return payload.previewClone;
}

export function createCloneDrag(
  runtime: {
    context: IPluginContext;
    createPreviewClone: (node: Konva.Image) => Konva.Image;
    finalizePreviewClone: (context: IPluginContext, previewClone: Konva.Image) => Konva.Image;
  },
  payload: { node: Konva.Image },
) {
  const previewClone = runtime.createPreviewClone(payload.node);
  runtime.context.dynamicLayer.add(previewClone);
  previewClone.startDrag();

  const finalizeCloneDrag = () => {
    previewClone.off("dragend", finalizeCloneDrag);
    const cloned = runtime.finalizePreviewClone(runtime.context, previewClone);
    runtime.context.setState("selection", cloned ? [cloned] : []);
  };

  previewClone.on("dragend", finalizeCloneDrag);
  return previewClone;
}
