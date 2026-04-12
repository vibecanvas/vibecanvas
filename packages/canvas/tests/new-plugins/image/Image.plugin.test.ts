import Konva from "konva";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createMockDocHandle, createNewCanvasHarness, flushCanvasEffects } from "../../new-test-setup";

vi.mock("../../../src/utils/image", () => ({
  getImageDimensions: vi.fn(async () => ({ width: 400, height: 200 })),
  getImageSource: ({ url, base64 }: { url: string | null; base64: string | null }) => url ?? base64,
  getSupportedImageFormat: (mimeType: string) => {
    const supported = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
    return supported.has(mimeType) ? mimeType : null;
  },
  parseDataUrl: vi.fn(() => ({ format: "image/png", base64: "Zm9v" })),
}));

function createImageElement(overrides?: Partial<TElement>): TElement {
  return {
    id: "image-1",
    x: 120,
    y: 140,
    rotation: 12,
    bindings: [],
    createdAt: 1,
    updatedAt: 2,
    locked: false,
    parentGroupId: null,
    zIndex: "a0",
    style: {
      opacity: 0.75,
    },
    data: {
      type: "image",
      url: "https://example.com/image.png",
      base64: null,
      w: 240,
      h: 160,
      crop: {
        x: 0,
        y: 0,
        width: 240,
        height: 160,
        naturalWidth: 240,
        naturalHeight: 160,
      },
    },
    ...overrides,
  };
}

function createPasteEvent(file: File) {
  const event = new Event("paste", { bubbles: true, cancelable: true }) as ClipboardEvent;
  Object.defineProperty(event, "clipboardData", {
    configurable: true,
    value: { files: [file] },
  });
  return event;
}

function altDragImage(node: Konva.Image, args: { deltaX: number; deltaY?: number }) {
  const beforeNodeIds = new Set(
    node.getStage()?.getLayers().flatMap((layer) => layer.getChildren()).map((child) => child._id) ?? [],
  );

  node.fire("dragstart", {
    target: node,
    currentTarget: node,
    evt: new MouseEvent("dragstart", { bubbles: true, altKey: true }),
  });

  const previewClone = node.getStage()?.getLayers()
    .flatMap((layer) => layer.getChildren())
    .find((child) => !beforeNodeIds.has(child._id) && child instanceof Konva.Image) as Konva.Image | undefined;

  if (!previewClone) {
    throw new Error("Expected image preview clone after alt-drag start");
  }

  const beforeAbsolutePosition = previewClone.absolutePosition();
  previewClone.setAbsolutePosition({
    x: beforeAbsolutePosition.x + args.deltaX,
    y: beforeAbsolutePosition.y + (args.deltaY ?? 0),
  });

  previewClone.fire("dragend", {
    target: previewClone,
    currentTarget: previewClone,
    evt: new MouseEvent("dragend", { bubbles: true, altKey: true }),
  });
}

describe("new Image plugin", () => {
  beforeEach(() => {
    class MockImage {
      onload: (() => void) | null = null;
      set src(_value: string) {}
    }

    vi.stubGlobal("Image", MockImage as unknown as typeof Image);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test("hydrates a document-backed image element into Konva.Image", async () => {
    const docHandle = createMockDocHandle({
      elements: {
        "image-1": createImageElement(),
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    await flushCanvasEffects();

    const node = harness.staticForegroundLayer.findOne((candidate: Konva.Node) => {
      return candidate instanceof Konva.Image && candidate.id() === "image-1";
    });

    expect(node).toBeInstanceOf(Konva.Image);
    expect((node as Konva.Image).x()).toBe(120);
    expect((node as Konva.Image).y()).toBe(140);
    expect((node as Konva.Image).width()).toBe(240);
    expect((node as Konva.Image).height()).toBe(160);
    expect((node as Konva.Image).opacity()).toBe(0.75);

    await harness.destroy();
  });

  test("selecting the image tool opens file picker", async () => {
    const harness = await createNewCanvasHarness({
      image: {
        uploadImage: vi.fn(async () => ({ url: "https://example.com/picker.png" })),
        cloneImage: vi.fn(async ({ url }: { url: string }) => ({ url })),
        deleteImage: vi.fn(async () => ({ ok: true as const })),
      },
      notification: {
        showError: vi.fn(),
        showSuccess: vi.fn(),
        showInfo: vi.fn(),
      },
    });
    const editor = harness.runtime.services.require("editor");

    const input = harness.stage.container().querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    const clickSpy = vi.spyOn(input!, "click");

    editor.getTool("image")?.onSelect?.();
    await flushCanvasEffects();

    expect(clickSpy).toHaveBeenCalledTimes(1);

    await harness.destroy();
  });

  test("paste from textarea is ignored", async () => {
    const uploadImage = vi.fn(async () => ({ url: "https://example.com/uploaded.png" }));

    const harness = await createNewCanvasHarness({
      image: {
        uploadImage,
        cloneImage: vi.fn(async ({ url }: { url: string }) => ({ url })),
        deleteImage: vi.fn(async () => ({ ok: true as const })),
      },
      notification: {
        showError: vi.fn(),
        showSuccess: vi.fn(),
        showInfo: vi.fn(),
      },
    });

    const textarea = document.createElement("textarea");
    harness.stage.container().appendChild(textarea);

    const file = new File([new Uint8Array([1, 2, 3])], "pasted.png", { type: "image/png" });
    textarea.dispatchEvent(createPasteEvent(file));
    await flushCanvasEffects();

    expect(uploadImage).not.toHaveBeenCalled();
    expect(Object.values(harness.docHandle.doc().elements)).toHaveLength(0);

    await harness.destroy();
  });

  test("paste uploads image and inserts a centered document element", async () => {
    const uploadImage = vi.fn(async () => ({ url: "https://example.com/uploaded.png" }));

    const harness = await createNewCanvasHarness({
      image: {
        uploadImage,
        cloneImage: vi.fn(async ({ url }: { url: string }) => ({ url })),
        deleteImage: vi.fn(async () => ({ ok: true as const })),
      },
      notification: {
        showError: vi.fn(),
        showSuccess: vi.fn(),
        showInfo: vi.fn(),
      },
    });

    const file = new File([new Uint8Array([1, 2, 3])], "pasted.png", { type: "image/png" });
    harness.stage.container().dispatchEvent(createPasteEvent(file));
    await flushCanvasEffects();
    await new Promise((resolve) => setTimeout(resolve, 20));
    await flushCanvasEffects();

    expect(uploadImage).toHaveBeenCalledWith({
      base64: "Zm9v",
      format: "image/png",
    });

    const inserted = Object.values(harness.docHandle.doc().elements);
    expect(inserted).toHaveLength(1);
    expect(inserted[0]?.data.type).toBe("image");

    const insertedImage = inserted[0] as TElement & {
      data: TElement["data"] & { type: "image"; url: string | null; w: number; h: number };
    };

    expect(insertedImage.data.url).toBe("https://example.com/uploaded.png");
    expect(insertedImage.x).toBeCloseTo(250, 4);
    expect(insertedImage.y).toBeCloseTo(225, 4);
    expect(insertedImage.data.w).toBeCloseTo(300, 4);
    expect(insertedImage.data.h).toBeCloseTo(150, 4);

    await harness.destroy();
  });

  test("alt-drag clone creates a second image and undo/redo keeps history coherent", async () => {
    const cloneImage = vi.fn(async ({ url }: { url: string }) => ({ url: `${url}?clone=1` }));
    const docHandle = createMockDocHandle({
      elements: {
        "image-1": createImageElement(),
      },
    });

    const harness = await createNewCanvasHarness({
      docHandle,
      image: {
        uploadImage: vi.fn(async () => ({ url: "https://example.com/uploaded.png" })),
        cloneImage,
        deleteImage: vi.fn(async () => ({ ok: true as const })),
      },
      notification: {
        showError: vi.fn(),
        showSuccess: vi.fn(),
        showInfo: vi.fn(),
      },
    });
    const selection = harness.runtime.services.require("selection");
    const history = harness.runtime.services.require("history");

    const node = harness.staticForegroundLayer.findOne((candidate: Konva.Node) => {
      return candidate instanceof Konva.Image && candidate.id() === "image-1";
    }) as Konva.Image | null;
    expect(node).toBeTruthy();

    selection.setSelection([node!]);
    selection.setFocusedNode(node!);
    await flushCanvasEffects();

    altDragImage(node!, { deltaX: 80, deltaY: 30 });
    await flushCanvasEffects();
    await new Promise((resolve) => setTimeout(resolve, 20));
    await flushCanvasEffects();

    expect(cloneImage).toHaveBeenCalledWith({ url: "https://example.com/image.png" });
    expect(harness.staticForegroundLayer.find((candidate: Konva.Node) => candidate instanceof Konva.Image)).toHaveLength(2);
    expect(Object.values(docHandle.doc().elements)).toHaveLength(2);

    const clonedDocElement = Object.values(docHandle.doc().elements).find((candidate) => candidate.id !== "image-1");
    expect(clonedDocElement?.data.type).toBe("image");
    expect((clonedDocElement?.data as { url: string | null }).url).toBe("https://example.com/image.png?clone=1");
    expect(selection.selection).toHaveLength(1);
    expect(selection.selection[0]).toBeInstanceOf(Konva.Image);

    history.undo();
    await flushCanvasEffects();
    expect(harness.staticForegroundLayer.find((candidate: Konva.Node) => candidate instanceof Konva.Image)).toHaveLength(1);
    expect(Object.values(docHandle.doc().elements)).toHaveLength(1);

    history.redo();
    await flushCanvasEffects();
    expect(harness.staticForegroundLayer.find((candidate: Konva.Node) => candidate instanceof Konva.Image)).toHaveLength(2);
    expect(Object.values(docHandle.doc().elements)).toHaveLength(2);

    await harness.destroy();
  });
});
