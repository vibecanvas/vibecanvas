import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc";
import Konva from "konva";
import type { TTool } from "../../components/FloatingCanvasToolbar/toolbar.types";
import { CustomEvents } from "../../custom-events";
import { CanvasMode } from "../../services/canvas/enum";
import type { IPlugin, IPluginContext } from "../shared/interface";
import { setNodeZIndex } from "../shared/render-order.shared";
import { fileToDataUrl, getImageDimensions, parseDataUrl } from "../../utils/image";
import {
  createImageElement,
  fitImageToViewport,
  getFirstSupportedImageFile,
  getViewportCenter,
  screenToWorld,
  shouldIgnoreClipboardEvent,
  type TInsertArgs,
} from "./Image.helpers";
import {
  createImageNode,
  createPreviewClone,
  loadImageIntoNode,
  toTElement,
  updateImageNodeFromElement,
} from "./Image.node";
import { cloneBackendFileForElement, releaseFilesForElements, retainFilesForElements } from "./Image.files";
import { createCloneDrag, finalizePreviewClone } from "./Image.clone";
import { safeStopDrag, setupImageListeners } from "./Image.listeners";

export class ImagePlugin implements IPlugin {
  #activeTool: TTool = "select";
  #dragOverDepth = 0;
  #fileInput: HTMLInputElement | null = null;

  apply(context: IPluginContext): void {
    this.setupToolState(context);
    ImagePlugin.setupCapabilities(context);
    this.setupFilePicker(context);
    this.setupPaste(context);
    this.setupDrop(context);
  }

  private setupToolState(context: IPluginContext) {
    context.hooks.customEvent.tap((event, payload) => {
      if (event !== CustomEvents.TOOL_SELECT) return false;
      const nextTool = payload as TTool;
      const wasImageTool = this.#activeTool === "image";
      this.#activeTool = nextTool;
      if (nextTool === "image" && !wasImageTool) {
        this.openFilePicker();
      }
      return false;
    });
  }

  private setupFilePicker(context: IPluginContext) {
    context.hooks.init.tap(() => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/png,image/jpeg,image/gif,image/webp";
      input.className = "hidden";

      input.addEventListener("change", () => {
        const file = input.files?.[0];
        const reset = () => {
          input.value = "";
        };

        if (!file) {
          reset();
          return;
        }

        void this.insertImage(context, { file })
          .finally(() => {
            reset();
          });
      });

      context.stage.container().appendChild(input);
      this.#fileInput = input;
    });

    context.hooks.destroy.tap(() => {
      this.#fileInput?.remove();
      this.#fileInput = null;
    });
  }

  private openFilePicker() {
    if (!this.#fileInput) return;
    this.#fileInput.click();
  }

  private setupPaste(context: IPluginContext) {
    const onPaste = (event: ClipboardEvent) => {
      if (shouldIgnoreClipboardEvent({ context }, event)) return;

      const file = getFirstSupportedImageFile(undefined, { files: event.clipboardData?.files });
      if (!file) return;

      event.preventDefault();
      void this.insertImage(context, { file });
    };

    context.stage.container().addEventListener("paste", onPaste);
    context.hooks.destroy.tap(() => {
      context.stage.container().removeEventListener("paste", onPaste);
    });
  }

  private setupDrop(context: IPluginContext) {
    const container = context.stage.container();

    const onDragOver = (event: DragEvent) => {
      const file = getFirstSupportedImageFile(undefined, { files: event.dataTransfer?.files });
      if (!file) return;

      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
    };

    const onDragEnter = (event: DragEvent) => {
      const file = getFirstSupportedImageFile(undefined, { files: event.dataTransfer?.files });
      if (!file) return;

      event.preventDefault();
      this.#dragOverDepth += 1;
    };

    const onDragLeave = () => {
      this.#dragOverDepth = Math.max(0, this.#dragOverDepth - 1);
    };

    const onDrop = (event: DragEvent) => {
      this.#dragOverDepth = 0;

      const file = getFirstSupportedImageFile(undefined, { files: event.dataTransfer?.files });
      if (!file) return;

      event.preventDefault();
      const rect = container.getBoundingClientRect();
      const point = screenToWorld({ context }, {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });

      void this.insertImage(context, { file, point });
    };

    container.addEventListener("dragover", onDragOver);
    container.addEventListener("dragenter", onDragEnter);
    container.addEventListener("dragleave", onDragLeave);
    container.addEventListener("drop", onDrop);
    context.hooks.destroy.tap(() => {
      container.removeEventListener("dragover", onDragOver);
      container.removeEventListener("dragenter", onDragEnter);
      container.removeEventListener("dragleave", onDragLeave);
      container.removeEventListener("drop", onDrop);
    });
  }

  private async insertImage(context: IPluginContext, args: TInsertArgs) {
    const uploadImage = context.capabilities.uploadImage;
    if (!uploadImage) {
      context.capabilities.notification?.showError("Image upload unavailable", "Canvas image upload capability is not configured.");
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(args.file);
      const parsed = parseDataUrl(dataUrl);
      if (!parsed) {
        context.capabilities.notification?.showError("Unsupported image format", args.file.type || "This image type is not supported.");
        return;
      }

      const naturalSize = await getImageDimensions(dataUrl);
      const { url } = await uploadImage({
        base64: parsed.base64,
        format: parsed.format,
      });

      const center = args.point ?? getViewportCenter({ context });
      const { width, height } = fitImageToViewport({ context }, naturalSize);
      const element = createImageElement(undefined, {
        id: crypto.randomUUID(),
        center,
        width,
        height,
        sourceUrl: url,
        naturalWidth: naturalSize.width,
        naturalHeight: naturalSize.height,
      });

      const node = ImagePlugin.createImageNode(element);
      ImagePlugin.setupImageListeners(context, node);
      node.setDraggable(true);
      context.staticForegroundLayer.add(node);
      context.capabilities.renderOrder?.assignOrderOnInsert({
        parent: context.staticForegroundLayer,
        nodes: [node],
        position: "front",
      });

      const insertedElement = ImagePlugin.toTElement(node);
      context.crdt.patch({ elements: [insertedElement], groups: [] });
      context.setState("selection", [node]);

      context.history.record({
        label: "insert-image",
        undo() {
          context.setState("selection", []);
          node.destroy();
          context.crdt.deleteById({ elementIds: [insertedElement.id] });
          context.staticForegroundLayer.batchDraw();
        },
        redo() {
          const recreatedNode = ImagePlugin.createImageNode(insertedElement);
          ImagePlugin.setupImageListeners(context, recreatedNode);
          recreatedNode.setDraggable(true);
          context.staticForegroundLayer.add(recreatedNode);
          setNodeZIndex(recreatedNode, insertedElement.zIndex);
          context.capabilities.renderOrder?.sortChildren(context.staticForegroundLayer);
          context.crdt.patch({ elements: [insertedElement], groups: [] });
          context.setState("selection", [recreatedNode]);
          context.staticForegroundLayer.batchDraw();
        },
      });

      if (this.#activeTool === "image") {
        context.setState("mode", CanvasMode.SELECT);
        context.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "select");
      }
    } catch (error) {
      const description = error instanceof Error ? error.message : "Failed to insert image";
      context.capabilities.notification?.showError("Failed to insert image", description);
      console.error("[ImagePlugin] Failed to insert image", error);
    }
  }

  private static setupCapabilities(context: IPluginContext) {
    const previousCreate = context.capabilities.createShapeFromTElement;
    context.capabilities.createShapeFromTElement = (element) => {
      if (element.data.type !== "image") return previousCreate?.(element) ?? null;

      const node = ImagePlugin.createImageNode(element);
      ImagePlugin.setupImageListeners(context, node);
      node.setDraggable(true);
      return node;
    };

    const previousToElement = context.capabilities.toElement;
    context.capabilities.toElement = (node) => {
      if (node instanceof Konva.Image) return ImagePlugin.toTElement(node);
      return previousToElement?.(node) ?? null;
    };

    const previousUpdate = context.capabilities.updateShapeFromTElement;
    context.capabilities.updateShapeFromTElement = (element) => {
      if (element.data.type !== "image") return previousUpdate?.(element) ?? null;

      const node = context.staticForegroundLayer.findOne((candidate: Konva.Node) => {
        return candidate instanceof Konva.Image && candidate.id() === element.id;
      });
      if (!(node instanceof Konva.Image)) return null;

      ImagePlugin.updateImageNodeFromElement(node, element);
      return node;
    };
  }

  static createImageNode(element: TElement): Konva.Image {
    return createImageNode({ loadImageIntoNode: ImagePlugin.loadImageIntoNode }, element);
  }

  static updateImageNodeFromElement(node: Konva.Image, element: TElement) {
    return updateImageNodeFromElement({ loadImageIntoNode: ImagePlugin.loadImageIntoNode }, { node, element });
  }

  static toTElement(node: Konva.Image): TElement {
    return toTElement(undefined, node);
  }

  static setupImageListeners(context: IPluginContext, node: Konva.Image) {
    return setupImageListeners(
      {
        context,
        toTElement: ImagePlugin.toTElement,
        safeStopDrag: ImagePlugin.safeStopDrag,
        createCloneDrag: ImagePlugin.createCloneDrag,
      },
      { node },
    );
  }

  static createPreviewClone(node: Konva.Image) {
    return createPreviewClone(undefined, node);
  }

  static createCloneDrag(context: IPluginContext, node: Konva.Image) {
    return createCloneDrag(
      {
        context,
        createPreviewClone: ImagePlugin.createPreviewClone,
        finalizePreviewClone: ImagePlugin.finalizePreviewClone,
      },
      { node },
    );
  }

  static finalizePreviewClone(context: IPluginContext, previewClone: Konva.Image) {
    return finalizePreviewClone(
      {
        context,
        setupImageListeners: ImagePlugin.setupImageListeners,
        toTElement: ImagePlugin.toTElement,
        cloneBackendFileForElement: ImagePlugin.cloneBackendFileForElement,
        createImageNode: ImagePlugin.createImageNode,
      },
      { previewClone },
    );
  }

  static retainFilesForElements(context: IPluginContext, elements: TElement[]) {
    return retainFilesForElements(
      {
        context,
        cloneBackendFileForElement: ImagePlugin.cloneBackendFileForElement,
      },
      { elements },
    );
  }

  static releaseFilesForElements(context: IPluginContext, elements: TElement[]) {
    return releaseFilesForElements({ context }, { elements });
  }

  static safeStopDrag(node: Konva.Node) {
    return safeStopDrag(undefined, node);
  }

  static loadImageIntoNode(node: Konva.Image, source: string | null) {
    return loadImageIntoNode(undefined, { node, source });
  }

  private static cloneBackendFileForElement(
    context: IPluginContext,
    element: TElement,
    errorTitle = "Failed to clone image file",
  ) {
    return cloneBackendFileForElement(
      {
        context,
        updateImageNodeFromElement: ImagePlugin.updateImageNodeFromElement,
      },
      { element, errorTitle },
    );
  }
}
