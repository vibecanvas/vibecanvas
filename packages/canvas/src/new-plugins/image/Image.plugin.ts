import { throttle } from "@solid-primitives/scheduled";
import type { IPlugin } from "@vibecanvas/runtime";
import type { TElement, TImageData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import ImageIcon from "lucide-static/icons/image.svg?raw";
import Konva from "konva";
import type { TCloneImage, TDeleteImage, TUploadImage } from "../../runtime";
import { getImageDimensions, getImageSource, getSupportedImageFormat, parseDataUrl } from "../../utils/image";
import type { ContextMenuService } from "../../new-services/context-menu/ContextMenuService";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { RenderOrderService } from "../../new-services/render-order/RenderOrderService";
import type { SceneService } from "../../new-services/scene/SceneService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import type { IHooks } from "../../runtime";
import { fxGetCanvasParentGroupId } from "../../core/fx.canvas-node-semantics";
import { fxFilterSelection } from "../../core/fx.filter-selection";
import { fnGetNodeZIndex } from "../../core/fn.get-node-z-index";
import { fnGetWorldPosition } from "../../core/fn.world-position";
import { txSetNodeZIndex } from "../../core/tx.set-node-z-index";
import { fxToImageElement } from "./fn.to-image-element";
import { txCloneBackendFileForElement } from "./tx.clone-backend-file-for-element";
import { txInsertImage } from "./tx.insert-image";
import { txSetupImageListeners } from "./tx.setup-image-listeners";
import { txUpdateImageNodeFromElement } from "./tx.update-image-node-from-element";
import { txDeleteSelection } from "../select/tx.delete-selection";

const IMAGE_URL_ATTR = "vcImageUrl";
const IMAGE_BASE64_ATTR = "vcImageBase64";
const IMAGE_CROP_ATTR = "vcImageCrop";
const IMAGE_SOURCE_ATTR = "vcImageSource";
const ELEMENT_CREATED_AT_ATTR = "vcElementCreatedAt";

const setNodeZIndex = (node: Konva.Group | Konva.Shape, zIndex: string) => txSetNodeZIndex({}, { node, zIndex });

function getImageCapabilities(config: {
  image?: {
    uploadImage: TUploadImage;
    cloneImage: TCloneImage;
    deleteImage: TDeleteImage;
  };
}) {
  return config.image;
}

function getNotification(config: {
  notification?: {
    showSuccess(title: string, description?: string): void;
    showError(title: string, description?: string): void;
    showInfo(title: string, description?: string): void;
  };
}) {
  return config.notification;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

function getFirstSupportedImageFile(files: Iterable<File> | ArrayLike<File> | null | undefined) {
  return Array.from(files ?? []).find((candidate) => {
    return getSupportedImageFormat(candidate.type) !== null;
  });
}

function screenToWorld(render: SceneService, point: { x: number; y: number }) {
  const transform = render.staticForegroundLayer.getAbsoluteTransform().copy();
  transform.invert();
  return transform.point(point);
}

function getViewportCenter(render: SceneService) {
  return screenToWorld(render, {
    x: render.stage.width() / 2,
    y: render.stage.height() / 2,
  });
}

function getViewportWorldSize(render: SceneService) {
  const worldTopLeft = screenToWorld(render, { x: 0, y: 0 });
  const worldBottomRight = screenToWorld(render, {
    x: render.stage.width(),
    y: render.stage.height(),
  });

  return {
    width: Math.abs(worldBottomRight.x - worldTopLeft.x),
    height: Math.abs(worldBottomRight.y - worldTopLeft.y),
  };
}

function shouldIgnoreClipboardEvent(editor: EditorService, event: ClipboardEvent) {
  if (editor.editingTextId !== null) {
    return true;
  }

  const target = event.target;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    return true;
  }

  if (target instanceof HTMLElement && target.isContentEditable) {
    return true;
  }

  return false;
}

function syncNodeMetadata(node: Konva.Image, element: TElement) {
  const data = element.data as TImageData;
  node.setAttr(IMAGE_URL_ATTR, data.url);
  node.setAttr(IMAGE_BASE64_ATTR, data.base64);
  node.setAttr(IMAGE_CROP_ATTR, structuredClone(data.crop));
  node.setAttr(IMAGE_SOURCE_ATTR, getImageSource({ url: data.url, base64: data.base64 }));
  node.setAttr(ELEMENT_CREATED_AT_ATTR, element.createdAt);
}

function loadImageIntoNode(node: Konva.Image, source: string | null) {
  node.setAttr(IMAGE_SOURCE_ATTR, source);
  if (!source) {
    node.image(null);
    node.getLayer()?.batchDraw();
    return;
  }

  const image = new window.Image();
  image.onload = () => {
    node.image(image);
    node.getLayer()?.batchDraw();
  };
  image.src = source;
}

function createImageNode(render: SceneService, element: TElement) {
  const data = element.data as TImageData;
  const node = new Konva.Image({
    id: element.id,
    x: element.x,
    y: element.y,
    rotation: element.rotation,
    width: data.w,
    height: data.h,
    opacity: element.style.opacity ?? 1,
    draggable: true,
    image: undefined,
  });

  syncNodeMetadata(node, element);
  setNodeZIndex(node, element.zIndex);
  loadImageIntoNode(node, getImageSource({ url: data.url, base64: data.base64 }));
  return node;
}

function updateImageNodeFromElement(render: SceneService, node: Konva.Image, element: TElement) {
  return txUpdateImageNodeFromElement({
    setNodeZIndex,
    syncNodeMetadata,
    getImageSource,
    loadImageIntoNode,
    batchDraw: () => {
      render.staticForegroundLayer.batchDraw();
    },
  }, {
    node,
    element,
  });
}

function toElement(render: SceneService, editor: EditorService, node: Konva.Image): TElement {
  const worldPosition = fnGetWorldPosition({
    absolutePosition: node.absolutePosition(),
    parentTransform: node.getLayer()?.getAbsoluteTransform() ?? null,
  });
  const absoluteScale = node.getAbsoluteScale();
  const layer = node.getLayer();
  const layerScaleX = layer?.scaleX() ?? 1;
  const layerScaleY = layer?.scaleY() ?? 1;
  const parentGroupId = fxGetCanvasParentGroupId({}, { editor, node });

  const crop = structuredClone(node.getAttr(IMAGE_CROP_ATTR) ?? {
    x: 0,
    y: 0,
    width: node.width(),
    height: node.height(),
    naturalWidth: node.width(),
    naturalHeight: node.height(),
  }) as TImageData["crop"];

  return fxToImageElement({
    id: node.id(),
    x: worldPosition.x,
    y: worldPosition.y,
    rotation: node.getAbsoluteRotation(),
    createdAt: Number(node.getAttr(ELEMENT_CREATED_AT_ATTR) ?? Date.now()),
    updatedAt: Date.now(),
    parentGroupId,
    zIndex: fnGetNodeZIndex({ node }),
    opacity: node.opacity(),
    url: (node.getAttr(IMAGE_URL_ATTR) as string | null) ?? null,
    base64: (node.getAttr(IMAGE_BASE64_ATTR) as string | null) ?? null,
    width: node.width() * (absoluteScale.x / layerScaleX),
    height: node.height() * (absoluteScale.y / layerScaleY),
    crop,
  });
}

function createPreviewClone(render: SceneService, node: Konva.Image) {
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

function safeStopDrag(node: Konva.Node) {
  try {
    if (node.isDragging()) {
      node.stopDrag();
    }
  } catch {
    return;
  }
}

function filterSelection(render: SceneService, editor: EditorService, selection: Konva.Node[]) {
  return fxFilterSelection({
    Konva,
  }, {
    editor,
    selection: selection.filter((node): node is Konva.Group | Konva.Shape => {
      return node instanceof Konva.Group || node instanceof Konva.Shape;
    }),
  });
}

/**
 * Handles image insertion and image node runtime wiring.
 * Supports picker, paste, drop, drag, and serialization hooks.
 */
export function createImagePlugin(): IPlugin<{
  contextMenu: ContextMenuService;
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  scene: SceneService;
  renderOrder: RenderOrderService;
  selection: SelectionService;
}, IHooks> {
  let fileInput: HTMLInputElement | null = null;

  return {
    name: "image",
    apply(ctx) {
      const contextMenu = ctx.services.require("contextMenu");
      const crdt = ctx.services.require("crdt");
      const editor = ctx.services.require("editor");
      const history = ctx.services.require("history");
      const render = ctx.services.require("scene");
      const renderOrder = ctx.services.require("renderOrder");
      const selection = ctx.services.require("selection");

      const updateImageNodeFromElementPortal = {
        setNodeZIndex,
        syncNodeMetadata,
        getImageSource,
        loadImageIntoNode,
        batchDraw: () => {
          render.staticForegroundLayer.batchDraw();
        },
      };

      const cloneBackendFileForElementPortal = {
        cloneImage: getImageCapabilities(ctx.config)?.cloneImage,
        crdt,
        findImageNodeById: (id: string) => {
          const node = render.staticForegroundLayer.findOne((candidate: Konva.Node) => {
            return candidate instanceof Konva.Image && candidate.id() === id;
          });

          return node instanceof Konva.Image ? node : null;
        },
        notification: getNotification(ctx.config),
        updateImageNodeFromElementPortal,
      };

      const setupNode = (node: Konva.Image) => {
        txSetupImageListeners({
          crdt,
          editor,
          history,
          render,
          selection,
          hooks: ctx.hooks,
          cloneDragPortal: {
            cloneBackendFileForElementPortal,
            crdt,
            history,
            render,
            renderOrder,
            selection,
            createPreviewClone: (sourceNode) => createPreviewClone(render, sourceNode),
            createImageNode: (element) => createImageNode(render, element),
            setupNode,
            toElement: (imageNode) => toElement(render, editor, imageNode),
            now: () => Date.now(),
          },
          updateImageNodeFromElementPortal,
          filterSelection: (nodes) => filterSelection(render, editor, nodes),
          safeStopDrag,
          toElement: (imageNode) => toElement(render, editor, imageNode),
          createThrottledPatch: () => {
            return throttle((element: TElement) => {
              crdt.patch({ elements: [element], groups: [] });
            }, 100);
          },
        }, {
          node,
        });
        return node;
      };

      const openFilePicker = () => {
        fileInput?.click();
      };

      const insertImage = async (args: { file: File; point?: { x: number; y: number } }) => {
        await txInsertImage({
          crdt,
          history,
          render,
          renderOrder,
          selection,
          uploadImage: getImageCapabilities(ctx.config)?.uploadImage,
          notification: getNotification(ctx.config),
          createId: () => crypto.randomUUID(),
          now: () => Date.now(),
          fileToDataUrl,
          parseDataUrl,
          getImageDimensions,
          getViewportCenter: () => getViewportCenter(render),
          getViewportWorldSize: () => getViewportWorldSize(render),
          createImageNode: (element) => createImageNode(render, element),
          setupNode,
          toElement: (node) => toElement(render, editor, node),
        }, args);
      };

      contextMenu.registerProvider("image", ({ targetElement, activeSelection }) => {
        if (targetElement?.data.type !== "image") {
          return [];
        }

        return [{
          id: "delete-image-selection",
          label: "Delete",
          priority: 300,
          onSelect: () => {
            selection.setSelection(activeSelection);
            txDeleteSelection({ crdt, editor, history, render, renderOrder, selection }, {});
          },
        }];
      });

      editor.registerTool({
        id: "image",
        label: "Image",
        icon: ImageIcon,
        shortcuts: ["9"],
        priority: 90,
        behavior: { type: "action" },
        onSelect: openFilePicker,
      });

      editor.registerToElement("image", (node) => {
        if (!(node instanceof Konva.Image)) {
          return null;
        }

        return toElement(render, editor, node);
      });

      editor.registerCreateShapeFromTElement("image", (element) => {
        if (element.data.type !== "image") {
          return null;
        }

        return setupNode(createImageNode(render, element));
      });

      editor.registerSetupExistingShape("image", (node) => {
        if (!(node instanceof Konva.Image)) {
          return false;
        }

        setupNode(node);
        return true;
      });

      editor.registerCloneElement("image", ({ sourceElement, clonedElement }) => {
        if (sourceElement.data.type !== "image" || clonedElement.data.type !== "image") {
          return false;
        }

        txCloneBackendFileForElement(cloneBackendFileForElementPortal, {
          element: clonedElement,
          errorTitle: "Failed to clone grouped image file",
          now: Date.now(),
        });
        return true;
      });

      editor.registerUpdateShapeFromTElement("image", (element) => {
        if (element.data.type !== "image") {
          return false;
        }

        const node = render.staticForegroundLayer.findOne((candidate: Konva.Node) => {
          return candidate instanceof Konva.Image && candidate.id() === element.id;
        });
        if (!(node instanceof Konva.Image)) {
          return false;
        }

        updateImageNodeFromElement(render, node, element);
        return true;
      });

      ctx.hooks.init.tap(() => {
        fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/png,image/jpeg,image/gif,image/webp";
        fileInput.className = "hidden";
        fileInput.addEventListener("change", () => {
          const file = fileInput?.files?.[0];
          const reset = () => {
            if (fileInput) {
              fileInput.value = "";
            }
          };

          if (!file) {
            reset();
            return;
          }

          void insertImage({ file }).finally(() => {
            reset();
          });
        });

        render.stage.container().appendChild(fileInput);

        const onPaste = (event: ClipboardEvent) => {
          if (shouldIgnoreClipboardEvent(editor, event)) {
            return;
          }

          const file = getFirstSupportedImageFile(event.clipboardData?.files);
          if (!file) {
            return;
          }

          event.preventDefault();
          void insertImage({ file });
        };

        const onDragOver = (event: DragEvent) => {
          const file = getFirstSupportedImageFile(event.dataTransfer?.files);
          if (!file) {
            return;
          }

          event.preventDefault();
          if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "copy";
          }
        };

        const onDragEnter = (event: DragEvent) => {
          const file = getFirstSupportedImageFile(event.dataTransfer?.files);
          if (!file) {
            return;
          }

          event.preventDefault();
        };

        const onDragLeave = () => {};

        const onDrop = (event: DragEvent) => {
          const file = getFirstSupportedImageFile(event.dataTransfer?.files);
          if (!file) {
            return;
          }

          event.preventDefault();
          const rect = render.stage.container().getBoundingClientRect();
          const point = screenToWorld(render, {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });

          void insertImage({ file, point });
        };

        render.stage.container().addEventListener("paste", onPaste);
        render.stage.container().addEventListener("dragover", onDragOver);
        render.stage.container().addEventListener("dragenter", onDragEnter);
        render.stage.container().addEventListener("dragleave", onDragLeave);
        render.stage.container().addEventListener("drop", onDrop);

        ctx.hooks.destroy.tap(() => {
          render.stage.container().removeEventListener("paste", onPaste);
          render.stage.container().removeEventListener("dragover", onDragOver);
          render.stage.container().removeEventListener("dragenter", onDragEnter);
          render.stage.container().removeEventListener("dragleave", onDragLeave);
          render.stage.container().removeEventListener("drop", onDrop);
          fileInput?.remove();
          fileInput = null;
        });
      });

      ctx.hooks.destroy.tap(() => {
        contextMenu.unregisterProvider("image");
        editor.unregisterTool("image");
        editor.unregisterToElement("image");
        editor.unregisterCreateShapeFromTElement("image");
        editor.unregisterSetupExistingShape("image");
        editor.unregisterCloneElement("image");
        editor.unregisterUpdateShapeFromTElement("image");
      });
    },
  };
}
