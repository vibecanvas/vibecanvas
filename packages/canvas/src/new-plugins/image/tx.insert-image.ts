import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { TImageUploadFormat, TUploadImage } from "../../services/canvas/interface";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { RenderOrderService } from "../../new-services/render-order/RenderOrderService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import { fxCreateImageElement } from "./fn.create-image-element";
import { fxFitImageToViewport } from "./fn.fit-image-to-viewport";

export type TPortalInsertImage = {
  crdt: CrdtService;
  history: HistoryService;
  render: RenderService;
  renderOrder: RenderOrderService;
  selection: SelectionService;
  uploadImage?: TUploadImage;
  notification?: {
    showError(title: string, description?: string): void;
  };
  createId: () => string;
  now: () => number;
  fileToDataUrl: (file: File) => Promise<string>;
  parseDataUrl: (dataUrl: string) => { format: TImageUploadFormat; base64: string } | null;
  getImageDimensions: (source: string) => Promise<{ width: number; height: number }>;
  getViewportCenter: () => { x: number; y: number };
  getViewportWorldSize: () => { width: number; height: number };
  createImageNode: (element: TElement) => Konva.Image;
  setupNode: (node: Konva.Image) => Konva.Image;
  toElement: (node: Konva.Image) => TElement;
};

export type TArgsInsertImage = {
  file: File;
  point?: { x: number; y: number };
};

export async function txInsertImage(
  portal: TPortalInsertImage,
  args: TArgsInsertImage,
) {
  if (!portal.uploadImage) {
    portal.notification?.showError("Image upload unavailable", "Canvas image upload capability is not configured.");
    return;
  }

  try {
    const dataUrl = await portal.fileToDataUrl(args.file);
    const parsed = portal.parseDataUrl(dataUrl);
    if (!parsed) {
      portal.notification?.showError("Unsupported image format", args.file.type || "This image type is not supported.");
      return;
    }

    const naturalSize = await portal.getImageDimensions(dataUrl);
    const { url } = await portal.uploadImage({
      base64: parsed.base64,
      format: parsed.format,
    });

    const center = args.point ?? portal.getViewportCenter();
    const viewportSize = portal.getViewportWorldSize();
    const fittedSize = fxFitImageToViewport({
      viewportWidth: viewportSize.width,
      viewportHeight: viewportSize.height,
      imageWidth: naturalSize.width,
      imageHeight: naturalSize.height,
    });

    const element = fxCreateImageElement({
      id: portal.createId(),
      center,
      width: fittedSize.width,
      height: fittedSize.height,
      sourceUrl: url,
      naturalWidth: naturalSize.width,
      naturalHeight: naturalSize.height,
      now: portal.now(),
    });

    const node = portal.setupNode(portal.createImageNode(element));
    node.setDraggable(true);
    portal.render.staticForegroundLayer.add(node);
    portal.renderOrder.assignOrderOnInsert({
      parent: portal.render.staticForegroundLayer,
      nodes: [node],
      position: "front",
    });
    portal.render.staticForegroundLayer.batchDraw();

    const insertedElement = portal.toElement(node);
    portal.crdt.patch({ elements: [insertedElement], groups: [] });
    portal.selection.setSelection([node]);
    portal.selection.setFocusedNode(node);

    portal.history.record({
      label: "insert-image",
      undo() {
        portal.selection.clear();
        node.destroy();
        portal.crdt.deleteById({ elementIds: [insertedElement.id] });
        portal.render.staticForegroundLayer.batchDraw();
      },
      redo() {
        const recreatedNode = portal.setupNode(portal.createImageNode(insertedElement));
        recreatedNode.setDraggable(true);
        portal.render.staticForegroundLayer.add(recreatedNode);
        portal.renderOrder.setNodeZIndex(recreatedNode, insertedElement.zIndex);
        portal.renderOrder.sortChildren(portal.render.staticForegroundLayer);
        portal.crdt.patch({ elements: [insertedElement], groups: [] });
        portal.selection.setSelection([recreatedNode]);
        portal.selection.setFocusedNode(recreatedNode);
        portal.render.staticForegroundLayer.batchDraw();
      },
    });
  } catch (error) {
    const description = error instanceof Error ? error.message : "Failed to insert image";
    portal.notification?.showError("Failed to insert image", description);
  }
}
