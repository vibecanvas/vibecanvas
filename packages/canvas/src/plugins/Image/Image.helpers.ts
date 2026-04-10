import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc";
import { getSupportedImageFormat } from "../../utils/image";
import type { IPluginContext } from "../shared/interface";

export type TInsertArgs = {
  file: File;
  point?: { x: number; y: number };
};

export function getFirstSupportedImageFile(
  _runtime: void,
  payload: { files: Iterable<File> | ArrayLike<File> | null | undefined },
) {
  return Array.from(payload.files ?? []).find((candidate) => {
    return getSupportedImageFormat(candidate.type) !== null;
  });
}

export function screenToWorld(runtime: { context: IPluginContext }, point: { x: number; y: number }) {
  const transform = runtime.context.staticForegroundLayer.getAbsoluteTransform().copy();
  transform.invert();
  return transform.point(point);
}

export function getViewportCenter(runtime: { context: IPluginContext }) {
  return screenToWorld(runtime, {
    x: runtime.context.stage.width() / 2,
    y: runtime.context.stage.height() / 2,
  });
}

export function fitImageToViewport(
  runtime: { context: IPluginContext },
  payload: { width: number; height: number },
) {
  const worldTopLeft = screenToWorld(runtime, { x: 0, y: 0 });
  const worldBottomRight = screenToWorld(runtime, {
    x: runtime.context.stage.width(),
    y: runtime.context.stage.height(),
  });
  const viewportWidth = Math.abs(worldBottomRight.x - worldTopLeft.x);
  const viewportHeight = Math.abs(worldBottomRight.y - worldTopLeft.y);
  const maxDimension = Math.min(viewportWidth, viewportHeight) / 2;
  const aspectRatio = payload.width / payload.height;

  if (payload.width >= payload.height) {
    const width = Math.min(payload.width, maxDimension);
    return { width, height: width / aspectRatio };
  }

  const height = Math.min(payload.height, maxDimension);
  return { width: height * aspectRatio, height };
}

export function createImageElement(
  _runtime: void,
  payload: {
    id: string;
    center: { x: number; y: number };
    width: number;
    height: number;
    sourceUrl: string;
    naturalWidth: number;
    naturalHeight: number;
  },
): TElement {
  return {
    id: payload.id,
    x: payload.center.x - payload.width / 2,
    y: payload.center.y - payload.height / 2,
    rotation: 0,
    bindings: [],
    createdAt: Date.now(),
    locked: false,
    parentGroupId: null,
    updatedAt: Date.now(),
    zIndex: "",
    style: { opacity: 1 },
    data: {
      type: "image",
      url: payload.sourceUrl,
      base64: null,
      w: payload.width,
      h: payload.height,
      crop: {
        x: 0,
        y: 0,
        width: payload.naturalWidth,
        height: payload.naturalHeight,
        naturalWidth: payload.naturalWidth,
        naturalHeight: payload.naturalHeight,
      },
    },
  };
}

export function shouldIgnoreClipboardEvent(runtime: { context: IPluginContext }, event: ClipboardEvent) {
  if (runtime.context.state.editingTextId !== null) return true;

  const target = event.target;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) return true;
  if (target instanceof HTMLElement && target.isContentEditable) return true;

  return false;
}
