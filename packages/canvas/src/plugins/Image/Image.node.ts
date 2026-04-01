import type { TElement, TElementStyle, TImageData } from "@vibecanvas/shell/automerge/index";
import Konva from "konva";
import { getWorldPosition, setWorldPosition } from "../shared/node-space";
import { getNodeZIndex, setNodeZIndex } from "../shared/render-order.shared";
import { getImageSource } from "../../utils/image";
import {
  ELEMENT_CREATED_AT_ATTR,
  IMAGE_BASE64_ATTR,
  IMAGE_CROP_ATTR,
  IMAGE_SOURCE_ATTR,
  IMAGE_URL_ATTR,
} from "./Image.constants";

function syncNodeMetadata(node: Konva.Image, element: TElement) {
  const data = element.data as TImageData;
  node.setAttr(IMAGE_URL_ATTR, data.url);
  node.setAttr(IMAGE_BASE64_ATTR, data.base64);
  node.setAttr(IMAGE_CROP_ATTR, structuredClone(data.crop));
  node.setAttr(IMAGE_SOURCE_ATTR, getImageSource({ url: data.url, base64: data.base64 }));
  node.setAttr(ELEMENT_CREATED_AT_ATTR, element.createdAt);
}

export async function loadImageIntoNode(
  _runtime: void,
  payload: { node: Konva.Image; source: string | null },
) {
  payload.node.setAttr(IMAGE_SOURCE_ATTR, payload.source);
  if (!payload.source) {
    payload.node.image(null);
    payload.node.getLayer()?.batchDraw();
    return;
  }

  const image = new window.Image();
  image.onload = () => {
    payload.node.image(image);
    payload.node.getLayer()?.batchDraw();
  };
  image.onerror = () => {
    console.warn("[ImagePlugin] Failed to load image source", payload.source);
  };
  image.src = payload.source;
}

export function createImageNode(
  runtime: { loadImageIntoNode: (node: Konva.Image, source: string | null) => Promise<void> | void },
  element: TElement,
) {
  const data = element.data as TImageData;
  const node = new Konva.Image({
    id: element.id,
    x: element.x,
    y: element.y,
    rotation: element.rotation,
    width: data.w,
    height: data.h,
    opacity: element.style.opacity ?? 1,
    draggable: false,
  });

  syncNodeMetadata(node, element);
  setNodeZIndex(node, element.zIndex);
  void runtime.loadImageIntoNode(node, getImageSource({ url: data.url, base64: data.base64 }));
  return node;
}

export function updateImageNodeFromElement(
  runtime: { loadImageIntoNode: (node: Konva.Image, source: string | null) => Promise<void> | void },
  payload: { node: Konva.Image; element: TElement },
) {
  const data = payload.element.data as TImageData;
  setWorldPosition(payload.node, { x: payload.element.x, y: payload.element.y });
  if (payload.node.getAbsoluteRotation() !== payload.element.rotation) payload.node.rotation(payload.element.rotation);
  if (payload.node.width() !== data.w) payload.node.width(data.w);
  if (payload.node.height() !== data.h) payload.node.height(data.h);
  if (payload.node.scaleX() !== 1) payload.node.scaleX(1);
  if (payload.node.scaleY() !== 1) payload.node.scaleY(1);
  if (payload.node.opacity() !== (payload.element.style.opacity ?? 1)) payload.node.opacity(payload.element.style.opacity ?? 1);
  setNodeZIndex(payload.node, payload.element.zIndex);
  syncNodeMetadata(payload.node, payload.element);

  const nextSource = getImageSource({ url: data.url, base64: data.base64 });
  if (payload.node.getAttr(IMAGE_SOURCE_ATTR) !== nextSource) {
    void runtime.loadImageIntoNode(payload.node, nextSource);
  }
}

export function toTElement(_runtime: void, node: Konva.Image): TElement {
  const worldPosition = getWorldPosition(node);
  const absoluteScale = node.getAbsoluteScale();
  const layer = node.getLayer();
  const layerScaleX = layer?.scaleX() ?? 1;
  const layerScaleY = layer?.scaleY() ?? 1;
  const parent = node.getParent();
  const parentGroupId = parent instanceof Konva.Group ? parent.id() : null;

  const style: TElementStyle = {
    opacity: node.opacity(),
  };

  const crop = structuredClone(node.getAttr(IMAGE_CROP_ATTR) ?? {
    x: 0,
    y: 0,
    width: node.width(),
    height: node.height(),
    naturalWidth: node.width(),
    naturalHeight: node.height(),
  }) as TImageData["crop"];

  return {
    id: node.id(),
    x: worldPosition.x,
    y: worldPosition.y,
    rotation: node.getAbsoluteRotation(),
    bindings: [],
    createdAt: Number(node.getAttr(ELEMENT_CREATED_AT_ATTR) ?? Date.now()),
    updatedAt: Date.now(),
    locked: false,
    parentGroupId,
    zIndex: getNodeZIndex(node),
    style,
    data: {
      type: "image",
      url: (node.getAttr(IMAGE_URL_ATTR) as string | null) ?? null,
      base64: (node.getAttr(IMAGE_BASE64_ATTR) as string | null) ?? null,
      w: node.width() * (absoluteScale.x / layerScaleX),
      h: node.height() * (absoluteScale.y / layerScaleY),
      crop,
    },
  };
}

export function createPreviewClone(_runtime: void, node: Konva.Image) {
  const clone = new Konva.Image({
    ...node.getAttrs(),
    id: crypto.randomUUID(),
    draggable: true,
  });
  clone.image(node.image());
  clone.setAttr(IMAGE_URL_ATTR, node.getAttr(IMAGE_URL_ATTR) ?? null);
  clone.setAttr(IMAGE_BASE64_ATTR, node.getAttr(IMAGE_BASE64_ATTR) ?? null);
  clone.setAttr(IMAGE_CROP_ATTR, structuredClone(node.getAttr(IMAGE_CROP_ATTR) ?? null));
  clone.setAttr(ELEMENT_CREATED_AT_ATTR, Date.now());
  clone.setAttr(IMAGE_SOURCE_ATTR, node.getAttr(IMAGE_SOURCE_ATTR) ?? null);
  setNodeZIndex(clone, "");
  return clone;
}
