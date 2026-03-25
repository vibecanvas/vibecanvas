import { throttle } from "@solid-primitives/scheduled";
import type { TElement, TElementStyle, TImageData } from "@vibecanvas/shell/automerge/index";
import Konva from "konva";
import type { TTool } from "../components/FloatingCanvasToolbar/toolbar.types";
import { CustomEvents } from "../custom-events";
import { CanvasMode } from "../services/canvas/enum";
import type { IPlugin, IPluginContext } from "./interface";
import { getWorldPosition, setWorldPosition } from "./node-space";
import { getNodeZIndex, setNodeZIndex } from "./render-order.shared";
import { TransformPlugin } from "./Transform.plugin";
import { fileToDataUrl, getImageDimensions, getImageSource, getSupportedImageFormat, parseDataUrl } from "../utils/image";
import { startSelectionCloneDrag } from "./clone-drag";

type TInsertArgs = {
  file: File;
  point?: { x: number; y: number };
};

const IMAGE_URL_ATTR = "vcImageUrl";
const IMAGE_BASE64_ATTR = "vcImageBase64";
const IMAGE_CROP_ATTR = "vcImageCrop";
const IMAGE_SOURCE_ATTR = "vcImageSource";
const ELEMENT_CREATED_AT_ATTR = "vcElementCreatedAt";

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
      if (ImagePlugin.shouldIgnoreClipboardEvent(context, event)) return;

      const file = Array.from(event.clipboardData?.files ?? []).find((candidate) => {
        return getSupportedImageFormat(candidate.type) !== null;
      });
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
      const file = Array.from(event.dataTransfer?.files ?? []).find((candidate) => {
        return getSupportedImageFormat(candidate.type) !== null;
      });
      if (!file) return;

      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
    };

    const onDragEnter = (event: DragEvent) => {
      const file = Array.from(event.dataTransfer?.files ?? []).find((candidate) => {
        return getSupportedImageFormat(candidate.type) !== null;
      });
      if (!file) return;

      event.preventDefault();
      this.#dragOverDepth += 1;
    };

    const onDragLeave = () => {
      this.#dragOverDepth = Math.max(0, this.#dragOverDepth - 1);
    };

    const onDrop = (event: DragEvent) => {
      this.#dragOverDepth = 0;

      const file = Array.from(event.dataTransfer?.files ?? []).find((candidate) => {
        return getSupportedImageFormat(candidate.type) !== null;
      });
      if (!file) return;

      event.preventDefault();
      const rect = container.getBoundingClientRect();
      const point = ImagePlugin.screenToWorld(context, {
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

      const center = args.point ?? ImagePlugin.getViewportCenter(context);
      const { width, height } = ImagePlugin.fitImageToViewport(context, naturalSize);
      const element = ImagePlugin.createImageElement({
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

    ImagePlugin.syncNodeMetadata(node, element);
    setNodeZIndex(node, element.zIndex);
    void ImagePlugin.loadImageIntoNode(node, getImageSource({ url: data.url, base64: data.base64 }));

    return node;
  }

  static updateImageNodeFromElement(node: Konva.Image, element: TElement) {
    const data = element.data as TImageData;
    setWorldPosition(node, { x: element.x, y: element.y });
    if (node.getAbsoluteRotation() !== element.rotation) node.rotation(element.rotation);
    if (node.width() !== data.w) node.width(data.w);
    if (node.height() !== data.h) node.height(data.h);
    if (node.scaleX() !== 1) node.scaleX(1);
    if (node.scaleY() !== 1) node.scaleY(1);
    if (node.opacity() !== (element.style.opacity ?? 1)) node.opacity(element.style.opacity ?? 1);
    setNodeZIndex(node, element.zIndex);
    ImagePlugin.syncNodeMetadata(node, element);

    const nextSource = getImageSource({ url: data.url, base64: data.base64 });
    if (node.getAttr(IMAGE_SOURCE_ATTR) !== nextSource) {
      void ImagePlugin.loadImageIntoNode(node, nextSource);
    }
  }

  static toTElement(node: Konva.Image): TElement {
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

  static setupImageListeners(context: IPluginContext, node: Konva.Image) {
    let originalElement: TElement | null = null;
    let isCloneDrag = false;
    const multiDragStartPositions = new Map<string, { x: number; y: number }>();
    const passengerOriginalElements = new Map<string, TElement[]>();

    const applyElement = (element: TElement) => {
      context.capabilities.updateShapeFromTElement?.(element);
      let parent = node.getParent();
      while (parent instanceof Konva.Group) {
        parent.fire("transform");
        parent = parent.getParent();
      }
    };

    const throttledPatch = throttle((element: TElement) => {
      context.crdt.patch({ elements: [element], groups: [] });
    }, 100);

    node.on("pointerclick", (event) => {
      if (context.state.mode !== CanvasMode.SELECT) return;
      context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERCLICK, event);
    });

    node.on("pointerdown dragstart", (event) => {
      if (context.state.mode !== CanvasMode.SELECT) {
        node.stopDrag();
        return;
      }

      if (event.type === "pointerdown") {
        const earlyExit = context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERDOWN, event);
        if (earlyExit) event.cancelBubble = true;
      }

      if (event.type === "dragstart" && event.evt.altKey) {
        isCloneDrag = true;
        ImagePlugin.safeStopDrag(node);
        if (startSelectionCloneDrag(context, node)) {
          isCloneDrag = false;
          return;
        }
        ImagePlugin.createCloneDrag(context, node);
        return;
      }
    });

    node.on("pointerdblclick", (event) => {
      if (context.state.mode !== CanvasMode.SELECT) return;
      const earlyExit = context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERDBLCLICK, event);
      if (earlyExit) event.cancelBubble = true;
    });

    node.on("dragstart", () => {
      if (isCloneDrag) return;
      originalElement = ImagePlugin.toTElement(node);
      multiDragStartPositions.clear();
      passengerOriginalElements.clear();

      const selected = TransformPlugin.filterSelection(context.state.selection);
      selected.forEach((selectedNode) => {
        multiDragStartPositions.set(selectedNode.id(), { ...selectedNode.absolutePosition() });
        if (selectedNode === node) return;

        if (selectedNode instanceof Konva.Shape) {
          const element = context.capabilities.toElement?.(selectedNode);
          if (element) passengerOriginalElements.set(selectedNode.id(), [structuredClone(element)]);
          return;
        }

        if (selectedNode instanceof Konva.Group) {
          const childElements = (selectedNode.find((child: Konva.Node) => child instanceof Konva.Shape) as Konva.Shape[])
            .map((child) => context.capabilities.toElement?.(child))
            .filter(Boolean) as TElement[];
          passengerOriginalElements.set(selectedNode.id(), structuredClone(childElements));
        }
      });
    });

    node.on("dragmove", () => {
      if (isCloneDrag) return;
      throttledPatch(ImagePlugin.toTElement(node));

      const selected = TransformPlugin.filterSelection(context.state.selection);
      if (selected.length <= 1) return;

      const start = multiDragStartPositions.get(node.id());
      if (!start) return;

      const current = node.absolutePosition();
      const dx = current.x - start.x;
      const dy = current.y - start.y;
      selected.forEach((other) => {
        if (other === node) return;
        if (other.isDragging()) return;

        const otherStart = multiDragStartPositions.get(other.id());
        if (!otherStart) return;

        other.absolutePosition({ x: otherStart.x + dx, y: otherStart.y + dy });
      });
    });

    node.on("dragend", () => {
      if (isCloneDrag) {
        isCloneDrag = false;
        originalElement = null;
        multiDragStartPositions.clear();
        passengerOriginalElements.clear();
        return;
      }

      const nextElement = ImagePlugin.toTElement(node);
      const beforeElement = originalElement ? structuredClone(originalElement) : null;
      const afterElement = structuredClone(nextElement);
      context.crdt.patch({ elements: [afterElement], groups: [] });

      const selected = TransformPlugin.filterSelection(context.state.selection);
      const passengers = selected.filter((selectedNode) => selectedNode !== node);
      const passengerAfterElements = new Map<string, TElement[]>();

      passengers.forEach((passenger) => {
        if (passenger instanceof Konva.Shape) {
          const element = context.capabilities.toElement?.(passenger);
          if (!element) return;

          const elements = [structuredClone(element)];
          passengerAfterElements.set(passenger.id(), elements);
          context.crdt.patch({ elements, groups: [] });
          return;
        }

        if (passenger instanceof Konva.Group) {
          const childElements = (passenger.find((child: Konva.Node) => child instanceof Konva.Shape) as Konva.Shape[])
            .map((child) => context.capabilities.toElement?.(child))
            .filter(Boolean) as TElement[];
          const elements = structuredClone(childElements);
          passengerAfterElements.set(passenger.id(), elements);
          if (elements.length > 0) {
            context.crdt.patch({ elements, groups: [] });
          }
        }
      });

      const capturedStartPositions = new Map(multiDragStartPositions);
      const capturedPassengerOriginals = new Map(passengerOriginalElements);
      multiDragStartPositions.clear();
      originalElement = null;

      if (!beforeElement) return;

      const didMove = beforeElement.x !== afterElement.x || beforeElement.y !== afterElement.y;
      if (!didMove) return;

      context.history.record({
        label: "drag-image",
        undo() {
          applyElement(beforeElement);
          context.crdt.patch({ elements: [beforeElement], groups: [] });
          passengers.forEach((passenger) => {
            const startPos = capturedStartPositions.get(passenger.id());
            if (startPos) passenger.absolutePosition(startPos);

            const originalEls = capturedPassengerOriginals.get(passenger.id());
            if (originalEls && originalEls.length > 0) {
              context.crdt.patch({ elements: originalEls, groups: [] });
            }
          });
        },
        redo() {
          applyElement(afterElement);
          context.crdt.patch({ elements: [afterElement], groups: [] });
          passengers.forEach((passenger) => {
            const afterEls = passengerAfterElements.get(passenger.id());
            if (!afterEls || afterEls.length === 0) return;

            if (passenger instanceof Konva.Shape) {
              context.capabilities.updateShapeFromTElement?.(afterEls[0]);
              context.crdt.patch({ elements: afterEls, groups: [] });
              return;
            }

            const startPos = capturedStartPositions.get(passenger.id());
            if (startPos) {
              const dx = afterElement.x - beforeElement.x;
              const dy = afterElement.y - beforeElement.y;
              passenger.absolutePosition({ x: startPos.x + dx, y: startPos.y + dy });
            }
            context.crdt.patch({ elements: afterEls, groups: [] });
          });
        },
      });
    });
  }

  static createPreviewClone(node: Konva.Image) {
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

  static createCloneDrag(context: IPluginContext, node: Konva.Image) {
    const previewClone = ImagePlugin.createPreviewClone(node);
    context.dynamicLayer.add(previewClone);
    previewClone.startDrag();

    const finalizeCloneDrag = () => {
      previewClone.off("dragend", finalizeCloneDrag);
      const cloned = ImagePlugin.finalizePreviewClone(context, previewClone);
      context.setState("selection", cloned ? [cloned] : []);
    };

    previewClone.on("dragend", finalizeCloneDrag);
    return previewClone;
  }

  static finalizePreviewClone(context: IPluginContext, previewClone: Konva.Image) {
    if (previewClone.isDragging()) {
      previewClone.stopDrag();
    }

    previewClone.moveTo(context.staticForegroundLayer);
    ImagePlugin.setupImageListeners(context, previewClone);
    previewClone.setDraggable(true);
    context.capabilities.renderOrder?.assignOrderOnInsert({
      parent: context.staticForegroundLayer,
      nodes: [previewClone],
      position: "front",
    });

    const element = ImagePlugin.toTElement(previewClone);
    context.crdt.patch({ elements: [element], groups: [] });
    ImagePlugin.cloneBackendFileForElement(context, element);
    context.history.record({
      label: "clone-image",
      undo() {
        previewClone.destroy();
        context.crdt.deleteById({ elementIds: [element.id] });
        context.setState("selection", []);
      },
      redo() {
        const recreated = ImagePlugin.createImageNode(element);
        ImagePlugin.setupImageListeners(context, recreated);
        recreated.setDraggable(true);
        context.staticForegroundLayer.add(recreated);
        setNodeZIndex(recreated, element.zIndex);
        context.capabilities.renderOrder?.sortChildren(context.staticForegroundLayer);
        context.crdt.patch({ elements: [element], groups: [] });
        context.setState("selection", [recreated]);
      },
    });
    return previewClone;
  }

  static retainFilesForElements(context: IPluginContext, elements: TElement[]) {
    elements.forEach((element) => {
      ImagePlugin.cloneBackendFileForElement(context, element, "Failed to restore image file");
    });
  }

  static releaseFilesForElements(context: IPluginContext, elements: TElement[]) {
    const deleteImage = context.capabilities.deleteImage;
    if (!deleteImage) return;

    elements.forEach((element) => {
      if (element.data.type !== "image") return;
      const url = element.data.url;
      if (!url) return;

      void deleteImage({ url }).catch((error) => {
        context.capabilities.notification?.showError(
          "Failed to delete image file",
          error instanceof Error ? error.message : "Unknown image delete error",
        );
      });
    });
  }

  static safeStopDrag(node: Konva.Node) {
    try {
      if (node.isDragging()) {
        node.stopDrag();
      }
    } catch {
      return;
    }
  }

  private static syncNodeMetadata(node: Konva.Image, element: TElement) {
    const data = element.data as TImageData;
    node.setAttr(IMAGE_URL_ATTR, data.url);
    node.setAttr(IMAGE_BASE64_ATTR, data.base64);
    node.setAttr(IMAGE_CROP_ATTR, structuredClone(data.crop));
    node.setAttr(IMAGE_SOURCE_ATTR, getImageSource({ url: data.url, base64: data.base64 }));
    node.setAttr(ELEMENT_CREATED_AT_ATTR, element.createdAt);
  }

  private static async loadImageIntoNode(node: Konva.Image, source: string | null) {
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
    image.onerror = () => {
      console.warn("[ImagePlugin] Failed to load image source", source);
    };
    image.src = source;
  }

  private static createImageElement(args: {
    id: string;
    center: { x: number; y: number };
    width: number;
    height: number;
    sourceUrl: string;
    naturalWidth: number;
    naturalHeight: number;
  }): TElement {
    return {
      id: args.id,
      x: args.center.x - args.width / 2,
      y: args.center.y - args.height / 2,
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
        url: args.sourceUrl,
        base64: null,
        w: args.width,
        h: args.height,
        crop: {
          x: 0,
          y: 0,
          width: args.naturalWidth,
          height: args.naturalHeight,
          naturalWidth: args.naturalWidth,
          naturalHeight: args.naturalHeight,
        },
      },
    };
  }

  private static fitImageToViewport(context: IPluginContext, size: { width: number; height: number }) {
    const worldTopLeft = ImagePlugin.screenToWorld(context, { x: 0, y: 0 });
    const worldBottomRight = ImagePlugin.screenToWorld(context, {
      x: context.stage.width(),
      y: context.stage.height(),
    });
    const viewportWidth = Math.abs(worldBottomRight.x - worldTopLeft.x);
    const viewportHeight = Math.abs(worldBottomRight.y - worldTopLeft.y);
    const maxDimension = Math.min(viewportWidth, viewportHeight) / 2;
    const aspectRatio = size.width / size.height;

    if (size.width >= size.height) {
      const width = Math.min(size.width, maxDimension);
      return { width, height: width / aspectRatio };
    }

    const height = Math.min(size.height, maxDimension);
    return { width: height * aspectRatio, height };
  }

  private static screenToWorld(context: IPluginContext, point: { x: number; y: number }) {
    const transform = context.staticForegroundLayer.getAbsoluteTransform().copy();
    transform.invert();
    return transform.point(point);
  }

  private static getViewportCenter(context: IPluginContext) {
    return ImagePlugin.screenToWorld(context, {
      x: context.stage.width() / 2,
      y: context.stage.height() / 2,
    });
  }

  private static shouldIgnoreClipboardEvent(context: IPluginContext, event: ClipboardEvent) {
    if (context.state.editingTextId !== null) return true;

    const target = event.target;
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) return true;
    if (target instanceof HTMLElement && target.isContentEditable) return true;

    return false;
  }

  private static cloneBackendFileForElement(
    context: IPluginContext,
    element: TElement,
    errorTitle = "Failed to clone image file",
  ) {
    if (element.data.type !== "image") return;
    const sourceUrl = element.data.url;
    const cloneImage = context.capabilities.cloneImage;
    if (!sourceUrl || !cloneImage) return;

    void cloneImage({ url: sourceUrl })
      .then(({ url }) => {
        if (url === sourceUrl) return;

        const currentNode = context.staticForegroundLayer.findOne((candidate: Konva.Node) => {
          return candidate instanceof Konva.Image && candidate.id() === element.id;
        });

        const nextElement: TElement = {
          ...element,
          updatedAt: Date.now(),
          data: {
            ...element.data,
            url,
          },
        };

        if (currentNode instanceof Konva.Image) {
          ImagePlugin.updateImageNodeFromElement(currentNode, nextElement);
        }

        context.crdt.patch({ elements: [nextElement], groups: [] });
      })
      .catch((error) => {
        context.capabilities.notification?.showError(
          errorTitle,
          error instanceof Error ? error.message : "Unknown image clone error",
        );
      });
  }
}
