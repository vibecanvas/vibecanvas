import type { TElement } from "@vibecanvas/shell/automerge/index";
import Konva from "konva";
import type { IPluginContext } from "../shared/interface";

export function cloneBackendFileForElement(
  runtime: {
    context: IPluginContext;
    updateImageNodeFromElement: (node: Konva.Image, element: TElement) => void;
  },
  payload: { element: TElement; errorTitle?: string },
) {
  if (payload.element.data.type !== "image") return;
  const sourceUrl = payload.element.data.url;
  const cloneImage = runtime.context.capabilities.cloneImage;
  if (!sourceUrl || !cloneImage) return;

  void cloneImage({ url: sourceUrl })
    .then(({ url }) => {
      if (url === sourceUrl) return;

      const currentNode = runtime.context.staticForegroundLayer.findOne((candidate: Konva.Node) => {
        return candidate instanceof Konva.Image && candidate.id() === payload.element.id;
      });

      const nextElement: TElement = {
        ...payload.element,
        updatedAt: Date.now(),
        data: {
          ...payload.element.data,
          url,
        },
      };

      if (currentNode instanceof Konva.Image) {
        runtime.updateImageNodeFromElement(currentNode, nextElement);
      }

      runtime.context.crdt.patch({ elements: [nextElement], groups: [] });
    })
    .catch((error) => {
      runtime.context.capabilities.notification?.showError(
        payload.errorTitle ?? "Failed to clone image file",
        error instanceof Error ? error.message : "Unknown image clone error",
      );
    });
}

export function retainFilesForElements(
  runtime: {
    context: IPluginContext;
    cloneBackendFileForElement: (context: IPluginContext, element: TElement, errorTitle?: string) => void;
  },
  payload: { elements: TElement[] },
) {
  payload.elements.forEach((element) => {
    runtime.cloneBackendFileForElement(runtime.context, element, "Failed to restore image file");
  });
}

export function releaseFilesForElements(runtime: { context: IPluginContext }, payload: { elements: TElement[] }) {
  const deleteImage = runtime.context.capabilities.deleteImage;
  if (!deleteImage) return;

  payload.elements.forEach((element) => {
    if (element.data.type !== "image") return;
    const url = element.data.url;
    if (!url) return;

    void deleteImage({ url }).catch((error) => {
      runtime.context.capabilities.notification?.showError(
        "Failed to delete image file",
        error instanceof Error ? error.message : "Unknown image delete error",
      );
    });
  });
}
