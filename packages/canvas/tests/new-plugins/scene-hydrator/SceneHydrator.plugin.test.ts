import type { DocHandle } from "@automerge/automerge-repo";
import type { TCanvasDoc, TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import Konva from "konva";
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
    id: "image-1",
    x: 10,
    y: 20,
    rotation: 0,
    zIndex: "a0",
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
      opacity: 0.8,
    },
    ...overrides,
  };
}

describe("new SceneHydrator plugin", () => {
  test("rehydrates scene on doc change and keeps selection on surviving nodes", async () => {
    const selectedElement = createImageElement({ id: "image-selected" });
    const remoteElement = createImageElement({ id: "image-live", x: 200 });
    const docHandle = createMockDocHandle({
      elements: {
        [selectedElement.id]: selectedElement,
      },
    }) as DocHandle<TCanvasDoc> & { __emitChange: () => void };

    const harness = await createNewCanvasHarness({ docHandle });
    const selection = harness.runtime.services.require("selection");

    const selectedNode = harness.staticForegroundLayer.findOne<Konva.Image>("#image-selected");
    if (!selectedNode) {
      throw new Error("missing selected node");
    }

    selection.setSelection([selectedNode]);
    selection.setFocusedNode(selectedNode);

    expect(harness.staticForegroundLayer.findOne<Konva.Image>("#image-live")).toBeFalsy();

    docHandle.change((doc) => {
      doc.elements[remoteElement.id] = remoteElement;
    });
    docHandle.__emitChange();
    await flushCanvasEffects();

    const hydratedSelectedNode = harness.staticForegroundLayer.findOne<Konva.Image>("#image-selected");
    const hydratedRemoteNode = harness.staticForegroundLayer.findOne<Konva.Image>("#image-live");

    expect(hydratedSelectedNode).toBeTruthy();
    expect(hydratedRemoteNode).toBeTruthy();
    expect(selection.selection[0]).toBe(hydratedSelectedNode);
    expect(selection.focusedId).toBe("image-selected");

    await harness.destroy();
  });
});
