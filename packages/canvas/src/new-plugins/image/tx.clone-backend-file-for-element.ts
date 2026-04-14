import type { TElement, TImageData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { TCloneImage } from "../../services/canvas/interface";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { SceneService } from "../../new-services/scene/SceneService";
import { txUpdateImageNodeFromElement } from "./tx.update-image-node-from-element";
import type { TPortalUpdateImageNodeFromElement } from "./tx.update-image-node-from-element";

export type TPortalCloneBackendFileForElement = {
  cloneImage?: TCloneImage;
  crdt: CrdtService;
  render: SceneService;
  notification?: {
    showError(title: string, description?: string): void;
  };
  updateImageNodeFromElementPortal: TPortalUpdateImageNodeFromElement;
};

export type TArgsCloneBackendFileForElement = {
  element: TElement;
  errorTitle?: string;
  now: number;
};

export function txCloneBackendFileForElement(
  portal: TPortalCloneBackendFileForElement,
  args: TArgsCloneBackendFileForElement,
) {
  if (args.element.data.type !== "image") {
    return;
  }

  const sourceUrl = args.element.data.url;
  if (!sourceUrl || !portal.cloneImage) {
    return;
  }

  void portal.cloneImage({ url: sourceUrl })
    .then(({ url }) => {
      if (url === sourceUrl) {
        return;
      }

      const currentNode = portal.render.staticForegroundLayer.findOne((candidate: Konva.Node) => {
        return candidate instanceof portal.render.Image && candidate.id() === args.element.id;
      });

      const nextElement: TElement = {
        ...args.element,
        updatedAt: args.now,
        data: {
          ...(args.element.data as TImageData),
          url,
        },
      };

      if (currentNode instanceof portal.render.Image) {
        txUpdateImageNodeFromElement(portal.updateImageNodeFromElementPortal, {
          node: currentNode,
          element: nextElement,
        });
      }

      portal.crdt.patch({ elements: [nextElement], groups: [] });
    })
    .catch((error) => {
      portal.notification?.showError(
        args.errorTitle ?? "Failed to clone image file",
        error instanceof Error ? error.message : "Unknown image clone error",
      );
    });
}
