import Konva from "konva";
import type { TCanvasDoc, TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { describe, expect, test, vi } from "vitest";
import { createMockDocHandle, createNewCanvasHarness, flushCanvasEffects } from "../../new-test-setup";

vi.mock("../../../src/utils/image", () => ({
  getImageDimensions: vi.fn(async () => ({ width: 400, height: 200 })),
  getImageSource: ({ url, base64 }: { url: string | null; base64: string | null }) => url ?? base64,
  getSupportedImageFormat: (mimeType: string) => mimeType,
  parseDataUrl: vi.fn(() => ({ format: "image/png", base64: "Zm9v" })),
}));

function createImageElement(overrides?: Partial<TElement>): TElement {
  return {
    id: "element-1",
    x: 10,
    y: 20,
    rotation: 0,
    zIndex: "z00000000",
    parentGroupId: null,
    bindings: [],
    locked: false,
    createdAt: 1,
    updatedAt: 2,
    data: {
      type: "image",
      url: "https://example.com/image.png",
      base64: null,
      w: 100,
      h: 80,
      crop: {
        x: 0,
        y: 0,
        width: 100,
        height: 80,
        naturalWidth: 100,
        naturalHeight: 80,
      },
    },
    style: {
      opacity: 1,
    },
    ...overrides,
  };
}

function createGroup(overrides?: Partial<TGroup>): TGroup {
  return {
    id: "group-1",
    parentGroupId: null,
    zIndex: "z00000000",
    locked: false,
    createdAt: 1,
    ...overrides,
  };
}

describe("new RenderOrder plugin", () => {
  test("hydrates mixed top-level groups and elements in zIndex order", async () => {
    const group = createGroup({ id: "group-top", zIndex: "z00000001" });
    const bottomImage = createImageElement({ id: "image-bottom", zIndex: "z00000000" });
    const topImage = createImageElement({ id: "image-top", zIndex: "z00000002", x: 200 });
    const docHandle = createMockDocHandle({
      groups: { [group.id]: group },
      elements: {
        [bottomImage.id]: bottomImage,
        [topImage.id]: topImage,
      },
    }) as unknown as { doc(): TCanvasDoc; change(cb: (doc: TCanvasDoc) => void): void };

    const harness = await createNewCanvasHarness({ docHandle: docHandle as never });

    const orderedIds = harness.staticForegroundLayer.getChildren()
      .filter((node) => node instanceof Konva.Group || node instanceof Konva.Image)
      .map((node) => node.id());

    expect(orderedIds).toEqual([bottomImage.id, group.id, topImage.id]);
    await harness.destroy();
  });

  test("render order service brings selected image to front", async () => {
    const backImage = createImageElement({ id: "image-back", x: 40, y: 40, zIndex: "z00000000" });
    const frontImage = createImageElement({ id: "image-front", x: 60, y: 60, zIndex: "z00000001" });
    const docHandle = createMockDocHandle({
      elements: {
        [backImage.id]: backImage,
        [frontImage.id]: frontImage,
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    const renderOrder = harness.runtime.services.require("renderOrder");

    const backNode = harness.staticForegroundLayer.findOne<Konva.Image>(`#${backImage.id}`);
    expect(backNode).toBeTruthy();

    renderOrder.bringSelectionToFront([backNode!]);
    await flushCanvasEffects();

    const orderedIds = harness.staticForegroundLayer.getChildren()
      .filter((node) => node instanceof Konva.Image)
      .map((node) => node.id());

    expect(orderedIds.at(-1)).toBe(backImage.id);
    expect(docHandle.doc().elements[backImage.id]?.zIndex).toBe("z00000001");
    await harness.destroy();
  });

  test("reordering does not mutate createdAt or updatedAt metadata", async () => {
    const backImage = createImageElement({
      id: "image-back",
      x: 40,
      y: 40,
      zIndex: "z00000000",
      createdAt: 111,
      updatedAt: 222,
    });
    const frontImage = createImageElement({
      id: "image-front",
      x: 60,
      y: 60,
      zIndex: "z00000001",
      createdAt: 333,
      updatedAt: 444,
    });
    const docHandle = createMockDocHandle({
      elements: {
        [backImage.id]: backImage,
        [frontImage.id]: frontImage,
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    const renderOrder = harness.runtime.services.require("renderOrder");

    const backNode = harness.staticForegroundLayer.findOne<Konva.Image>(`#${backImage.id}`);
    expect(backNode).toBeTruthy();

    renderOrder.bringSelectionToFront([backNode!]);
    await flushCanvasEffects();

    expect(docHandle.doc().elements[backImage.id]?.createdAt).toBe(111);
    expect(docHandle.doc().elements[backImage.id]?.updatedAt).toBe(222);
    expect(docHandle.doc().elements[frontImage.id]?.createdAt).toBe(333);
    expect(docHandle.doc().elements[frontImage.id]?.updatedAt).toBe(444);

    await harness.destroy();
  });

  test.skip("context menu opens item actions on right click", async () => {
    // blocked for now
    // reason: no migrated context-menu plugin path in src/new-plugins
    // old test belongs to old ContextMenuPlugin behavior, not render-order service itself
  });
});
