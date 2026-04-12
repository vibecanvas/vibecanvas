import type { IPlugin } from "@vibecanvas/runtime";
import type { TElement, TElementStyle, TImageData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { throttle } from "@solid-primitives/scheduled";
import type Konva from "konva";
import type { TCloneImage, TDeleteImage, TUploadImage } from "../../services/canvas/interface";
import { getImageDimensions, getImageSource, getSupportedImageFormat, parseDataUrl } from "../../utils/image";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import { CanvasMode } from "../../new-services/selection/enum";
import type { IHooks, TElementPointerEvent } from "../../runtime";
import { getWorldPosition, setWorldPosition } from "../../plugins/shared/node-space";
import { getNodeZIndex, setNodeZIndex } from "../../plugins/shared/render-order.shared";

const IMAGE_URL_ATTR = "vcImageUrl";
const IMAGE_BASE64_ATTR = "vcImageBase64";
const IMAGE_CROP_ATTR = "vcImageCrop";
const IMAGE_SOURCE_ATTR = "vcImageSource";
const ELEMENT_CREATED_AT_ATTR = "vcElementCreatedAt";

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

function screenToWorld(render: RenderService, point: { x: number; y: number }) {
  const transform = render.staticForegroundLayer.getAbsoluteTransform().copy();
  transform.invert();
  return transform.point(point);
}

function getViewportCenter(render: RenderService) {
  return screenToWorld(render, {
    x: render.stage.width() / 2,
    y: render.stage.height() / 2,
  });
}

function fitImageToViewport(render: RenderService, size: { width: number; height: number }) {
  const worldTopLeft = screenToWorld(render, { x: 0, y: 0 });
  const worldBottomRight = screenToWorld(render, {
    x: render.stage.width(),
    y: render.stage.height(),
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

function createImageElement(args: {
  id: string;
  center: { x: number; y: number };
  width: number;
  height: number;
  sourceUrl: string;
  naturalWidth: number;
  naturalHeight: number;
}) {
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
  } satisfies TElement;
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

function createImageNode(render: RenderService, element: TElement) {
  const data = element.data as TImageData;
  const node = new render.Image({
    id: element.id,
    x: element.x,
    y: element.y,
    rotation: element.rotation,
    width: data.w,
    height: data.h,
    opacity: element.style.opacity ?? 1,
    draggable: false,
    image: undefined,
  });

  syncNodeMetadata(node, element);
  setNodeZIndex(node, element.zIndex);
  loadImageIntoNode(node, getImageSource({ url: data.url, base64: data.base64 }));
  return node;
}

function updateImageNodeFromElement(render: RenderService, node: Konva.Image, element: TElement) {
  const data = element.data as TImageData;
  setWorldPosition(node, { x: element.x, y: element.y });
  if (node.getAbsoluteRotation() !== element.rotation) {
    node.rotation(element.rotation);
  }
  if (node.width() !== data.w) {
    node.width(data.w);
  }
  if (node.height() !== data.h) {
    node.height(data.h);
  }
  if (node.scaleX() !== 1) {
    node.scaleX(1);
  }
  if (node.scaleY() !== 1) {
    node.scaleY(1);
  }
  if (node.opacity() !== (element.style.opacity ?? 1)) {
    node.opacity(element.style.opacity ?? 1);
  }
  setNodeZIndex(node, element.zIndex);
  syncNodeMetadata(node, element);

  const nextSource = getImageSource({ url: data.url, base64: data.base64 });
  if (node.getAttr(IMAGE_SOURCE_ATTR) !== nextSource) {
    loadImageIntoNode(node, nextSource);
  }

  render.staticForegroundLayer.batchDraw();
}

function toElement(render: RenderService, node: Konva.Image): TElement {
  const worldPosition = getWorldPosition(node);
  const absoluteScale = node.getAbsoluteScale();
  const layer = node.getLayer();
  const layerScaleX = layer?.scaleX() ?? 1;
  const layerScaleY = layer?.scaleY() ?? 1;
  const parent = node.getParent();
  const parentGroupId = parent instanceof render.Group ? parent.id() : null;

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

function createPreviewClone(render: RenderService, node: Konva.Image) {
  const clone = new render.Image({
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

function filterSelection(render: RenderService, selection: Konva.Node[]) {
  let subSelection = selection.find((node) => node.getParent() instanceof render.Group);
  if (!subSelection) {
    return selection.filter((node) => node.getStage() !== null);
  }

  const findDeepestSubSelection = () => {
    const deeperSubSelection = selection.find((node) => node.getParent() === subSelection);
    if (!deeperSubSelection) {
      return;
    }

    subSelection = deeperSubSelection;
    findDeepestSubSelection();
  };

  findDeepestSubSelection();

  return subSelection && subSelection.getStage() !== null ? [subSelection] : [];
}

function cloneBackendFileForElement(args: {
  config: {
    image?: {
      cloneImage: TCloneImage;
    };
    notification?: {
      showError(title: string, description?: string): void;
    };
  };
  crdt: CrdtService;
  render: RenderService;
  element: TElement;
  errorTitle?: string;
}) {
  if (args.element.data.type !== "image") {
    return;
  }

  const sourceUrl = args.element.data.url;
  const cloneImage = args.config.image?.cloneImage;
  if (!sourceUrl || !cloneImage) {
    return;
  }

  void cloneImage({ url: sourceUrl })
    .then(({ url }) => {
      if (url === sourceUrl) {
        return;
      }

      const currentNode = args.render.staticForegroundLayer.findOne((candidate: Konva.Node) => {
        return candidate instanceof args.render.Image && candidate.id() === args.element.id;
      });

      const nextElement: TElement = {
        ...args.element,
        updatedAt: Date.now(),
        data: {
          ...(args.element.data as TImageData),
          url,
        },
      };

      if (currentNode instanceof args.render.Image) {
        updateImageNodeFromElement(args.render, currentNode, nextElement);
      }

      args.crdt.patch({ elements: [nextElement], groups: [] });
    })
    .catch((error) => {
      args.config.notification?.showError(
        args.errorTitle ?? "Failed to clone image file",
        error instanceof Error ? error.message : "Unknown image clone error",
      );
    });
}

function createCloneDrag(args: {
  config: {
    image?: {
      cloneImage: TCloneImage;
    };
    notification?: {
      showError(title: string, description?: string): void;
    };
  };
  crdt: CrdtService;
  history: HistoryService;
  render: RenderService;
  selection: SelectionService;
  setupNode: (node: Konva.Image) => Konva.Image;
  node: Konva.Image;
}) {
  const previewClone = createPreviewClone(args.render, args.node);
  args.render.dynamicLayer.add(previewClone);
  previewClone.startDrag();

  const finalizeCloneDrag = () => {
    previewClone.off("dragend", finalizeCloneDrag);
    if (previewClone.isDragging()) {
      previewClone.stopDrag();
    }

    previewClone.moveTo(args.render.staticForegroundLayer);
    args.setupNode(previewClone);
    previewClone.setDraggable(true);

    const element = toElement(args.render, previewClone);
    args.crdt.patch({ elements: [element], groups: [] });
    cloneBackendFileForElement({
      config: args.config,
      crdt: args.crdt,
      render: args.render,
      element,
    });

    args.history.record({
      label: "clone-image",
      undo() {
        previewClone.destroy();
        args.crdt.deleteById({ elementIds: [element.id] });
        args.selection.clear();
        args.render.staticForegroundLayer.batchDraw();
      },
      redo() {
        const recreated = args.setupNode(createImageNode(args.render, element));
        recreated.setDraggable(true);
        args.render.staticForegroundLayer.add(recreated);
        setNodeZIndex(recreated, element.zIndex);
        args.crdt.patch({ elements: [element], groups: [] });
        args.selection.setSelection([recreated]);
        args.selection.setFocusedNode(recreated);
        args.render.staticForegroundLayer.batchDraw();
      },
    });

    args.selection.setSelection([previewClone]);
    args.selection.setFocusedNode(previewClone);
  };

  previewClone.on("dragend", finalizeCloneDrag);
  return previewClone;
}

function setupImageListeners(args: {
  config: {
    image?: {
      cloneImage: TCloneImage;
    };
    notification?: {
      showError(title: string, description?: string): void;
    };
  };
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  render: RenderService;
  selection: SelectionService;
  hooks: IHooks;
  node: Konva.Image;
}) {
  let originalElement: TElement | null = null;
  let isCloneDrag = false;
  const multiDragStartPositions = new Map<string, { x: number; y: number }>();
  const passengerOriginalElements = new Map<string, TElement[]>();

  const applyElement = (element: TElement) => {
    updateImageNodeFromElement(args.render, args.node, element);
    let parent = args.node.getParent();
    while (parent instanceof args.render.Group) {
      parent.fire("transform");
      parent = parent.getParent();
    }
  };

  const throttledPatch = throttle((element: TElement) => {
    args.crdt.patch({ elements: [element], groups: [] });
  }, 100);

  args.node.off("pointerclick pointerdown dragstart pointerdblclick dragmove dragend");

  args.node.on("pointerclick", (event) => {
    if (args.selection.mode !== CanvasMode.SELECT) {
      return;
    }

    args.hooks.elementPointerClick.call(event as TElementPointerEvent);
  });

  args.node.on("pointerdown dragstart", (event) => {
    if (args.selection.mode !== CanvasMode.SELECT) {
      safeStopDrag(args.node);
      return;
    }

    if (event.type === "pointerdown") {
      const earlyExit = args.hooks.elementPointerDown.call(event as TElementPointerEvent);
      if (earlyExit) {
        event.cancelBubble = true;
      }
    }

    if (event.type === "dragstart" && event.evt.altKey) {
      isCloneDrag = true;
      safeStopDrag(args.node);
      createCloneDrag({
        config: args.config,
        crdt: args.crdt,
        history: args.history,
        render: args.render,
        selection: args.selection,
        setupNode: (node) => {
          return setupImageListeners({
            config: args.config,
            crdt: args.crdt,
            editor: args.editor,
            history: args.history,
            render: args.render,
            selection: args.selection,
            hooks: args.hooks,
            node,
          }), node;
        },
        node: args.node,
      });
    }
  });

  args.node.on("pointerdblclick", (event) => {
    if (args.selection.mode !== CanvasMode.SELECT) {
      return;
    }

    const earlyExit = args.hooks.elementPointerDoubleClick.call(event as TElementPointerEvent);
    if (earlyExit) {
      event.cancelBubble = true;
    }
  });

  args.node.on("dragstart", () => {
    if (isCloneDrag) {
      return;
    }

    originalElement = toElement(args.render, args.node);
    multiDragStartPositions.clear();
    passengerOriginalElements.clear();

    const selected = filterSelection(args.render, args.selection.selection);
    selected.forEach((selectedNode) => {
      multiDragStartPositions.set(selectedNode.id(), { ...selectedNode.absolutePosition() });
      if (selectedNode === args.node) {
        return;
      }

      const element = args.editor.toElement(selectedNode);
      if (element) {
        passengerOriginalElements.set(selectedNode.id(), [structuredClone(element)]);
      }
    });
  });

  args.node.on("dragmove", () => {
    if (isCloneDrag) {
      return;
    }

    throttledPatch(toElement(args.render, args.node));

    const selected = filterSelection(args.render, args.selection.selection);
    if (selected.length <= 1) {
      return;
    }

    const start = multiDragStartPositions.get(args.node.id());
    if (!start) {
      return;
    }

    const current = args.node.absolutePosition();
    const dx = current.x - start.x;
    const dy = current.y - start.y;

    selected.forEach((other) => {
      if (other === args.node || other.isDragging()) {
        return;
      }

      const otherStart = multiDragStartPositions.get(other.id());
      if (!otherStart) {
        return;
      }

      other.absolutePosition({ x: otherStart.x + dx, y: otherStart.y + dy });
    });
  });

  args.node.on("dragend", () => {
    if (isCloneDrag) {
      isCloneDrag = false;
      originalElement = null;
      multiDragStartPositions.clear();
      passengerOriginalElements.clear();
      return;
    }

    const nextElement = toElement(args.render, args.node);
    const beforeElement = originalElement ? structuredClone(originalElement) : null;
    const afterElement = structuredClone(nextElement);
    args.crdt.patch({ elements: [afterElement], groups: [] });

    const selected = filterSelection(args.render, args.selection.selection);
    const passengers = selected.filter((selectedNode) => selectedNode !== args.node);
    const passengerAfterElements = new Map<string, TElement[]>();

    passengers.forEach((passenger) => {
      const element = args.editor.toElement(passenger);
      if (!element) {
        return;
      }

      const elements = [structuredClone(element)];
      passengerAfterElements.set(passenger.id(), elements);
      args.crdt.patch({ elements, groups: [] });
    });

    const capturedStartPositions = new Map(multiDragStartPositions);
    const capturedPassengerOriginals = new Map(passengerOriginalElements);
    multiDragStartPositions.clear();
    originalElement = null;

    if (!beforeElement) {
      return;
    }

    const didMove = beforeElement.x !== afterElement.x || beforeElement.y !== afterElement.y;
    if (!didMove) {
      return;
    }

    args.history.record({
      label: "drag-image",
      undo() {
        applyElement(beforeElement);
        args.crdt.patch({ elements: [beforeElement], groups: [] });
        passengers.forEach((passenger) => {
          const startPos = capturedStartPositions.get(passenger.id());
          if (startPos) {
            passenger.absolutePosition(startPos);
          }

          const originalEls = capturedPassengerOriginals.get(passenger.id());
          if (originalEls && originalEls.length > 0) {
            args.crdt.patch({ elements: originalEls, groups: [] });
          }
        });
      },
      redo() {
        applyElement(afterElement);
        args.crdt.patch({ elements: [afterElement], groups: [] });
        passengers.forEach((passenger) => {
          const afterEls = passengerAfterElements.get(passenger.id());
          if (!afterEls || afterEls.length === 0) {
            return;
          }

          args.editor.updateShapeFromTElement(afterEls[0]);
          args.crdt.patch({ elements: afterEls, groups: [] });
        });
      },
    });
  });
}

/**
 * Handles image insertion and image node runtime wiring.
 * Supports picker, paste, drop, drag, and serialization hooks.
 */
export function createImagePlugin(): IPlugin<{
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  render: RenderService;
  selection: SelectionService;
}, IHooks> {
  let fileInput: HTMLInputElement | null = null;

  return {
    name: "image",
    apply(ctx) {
      const crdt = ctx.services.require("crdt");
      const editor = ctx.services.require("editor");
      const history = ctx.services.require("history");
      const render = ctx.services.require("render");
      const selection = ctx.services.require("selection");

      const setupNode = (node: Konva.Image) => {
        setupImageListeners({
          config: ctx.config,
          crdt,
          editor,
          history,
          render,
          selection,
          hooks: ctx.hooks,
          node,
        });
        return node;
      };

      const openFilePicker = () => {
        fileInput?.click();
      };

      const insertImage = async (args: { file: File; point?: { x: number; y: number } }) => {
        const uploadImage = getImageCapabilities(ctx.config)?.uploadImage;
        if (!uploadImage) {
          getNotification(ctx.config)?.showError("Image upload unavailable", "Canvas image upload capability is not configured.");
          return;
        }

        try {
          const dataUrl = await fileToDataUrl(args.file);
          const parsed = parseDataUrl(dataUrl);
          if (!parsed) {
            getNotification(ctx.config)?.showError("Unsupported image format", args.file.type || "This image type is not supported.");
            return;
          }

          const naturalSize = await getImageDimensions(dataUrl);
          const { url } = await uploadImage({
            base64: parsed.base64,
            format: parsed.format,
          });

          const center = args.point ?? getViewportCenter(render);
          const { width, height } = fitImageToViewport(render, naturalSize);
          const element = createImageElement({
            id: crypto.randomUUID(),
            center,
            width,
            height,
            sourceUrl: url,
            naturalWidth: naturalSize.width,
            naturalHeight: naturalSize.height,
          });

          const node = setupNode(createImageNode(render, element));
          node.setDraggable(true);
          render.staticForegroundLayer.add(node);
          render.staticForegroundLayer.batchDraw();

          const insertedElement = toElement(render, node);
          crdt.patch({ elements: [insertedElement], groups: [] });
          selection.setSelection([node]);
          selection.setFocusedNode(node);

          history.record({
            label: "insert-image",
            undo() {
              selection.clear();
              node.destroy();
              crdt.deleteById({ elementIds: [insertedElement.id] });
              render.staticForegroundLayer.batchDraw();
            },
            redo() {
              const recreatedNode = setupNode(createImageNode(render, insertedElement));
              recreatedNode.setDraggable(true);
              render.staticForegroundLayer.add(recreatedNode);
              setNodeZIndex(recreatedNode, insertedElement.zIndex);
              crdt.patch({ elements: [insertedElement], groups: [] });
              selection.setSelection([recreatedNode]);
              selection.setFocusedNode(recreatedNode);
              render.staticForegroundLayer.batchDraw();
            },
          });
        } catch (error) {
          const description = error instanceof Error ? error.message : "Failed to insert image";
          getNotification(ctx.config)?.showError("Failed to insert image", description);
        }
      };

      editor.registerTool({
        id: "image",
        label: "Image",
        shortcuts: ["9"],
        priority: 90,
        behavior: { type: "action" },
        onSelect: openFilePicker,
      });

      editor.registerToElement("image", (node) => {
        if (!(node instanceof render.Image)) {
          return null;
        }

        return toElement(render, node);
      });

      editor.registerUpdateShapeFromTElement("image", (element) => {
        if (element.data.type !== "image") {
          return false;
        }

        const node = render.staticForegroundLayer.findOne((candidate: Konva.Node) => {
          return candidate instanceof render.Image && candidate.id() === element.id;
        });
        if (!(node instanceof render.Image)) {
          console.debug("[image] updateShapeFromTElement missing node", { id: element.id });
          return false;
        }

        console.debug("[image] updateShapeFromTElement", {
          id: element.id,
          x: element.x,
          y: element.y,
          rotation: element.rotation,
          width: element.data.type === "image" ? element.data.w : undefined,
          height: element.data.type === "image" ? element.data.h : undefined,
          before: {
            scaleX: node.scaleX(),
            scaleY: node.scaleY(),
            rotation: node.rotation(),
            width: node.width(),
            height: node.height(),
          },
        });

        updateImageNodeFromElement(render, node, element);

        console.debug("[image] updateShapeFromTElement after", {
          id: element.id,
          after: {
            scaleX: node.scaleX(),
            scaleY: node.scaleY(),
            rotation: node.rotation(),
            width: node.width(),
            height: node.height(),
          },
        });
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
        editor.unregisterTool("image");
        editor.unregisterToElement("image");
        editor.unregisterUpdateShapeFromTElement("image");
      });
    },
  };
}
