import Konva from "konva";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
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
    x: 120,
    y: 140,
    rotation: 0,
    bindings: [],
    createdAt: 1,
    updatedAt: 2,
    locked: false,
    parentGroupId: null,
    zIndex: "z00000000",
    style: { opacity: 1 },
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

function fireGroupShortcut(runtime: Awaited<ReturnType<typeof createNewCanvasHarness>>["runtime"]) {
  const event = new KeyboardEvent("keydown", {
    key: "g",
    metaKey: true,
    bubbles: true,
    cancelable: true,
  });
  runtime.hooks.keydown.call(event);
}

function createGroup(id: string, parentGroupId: string | null, zIndex: string) {
  return {
    id,
    parentGroupId,
    zIndex,
    locked: false,
    createdAt: 1,
  };
}

function firePointerDown(node: Konva.Node, args?: { shiftKey?: boolean }) {
  node.fire("pointerdown", {
    evt: new MouseEvent("pointerdown", { bubbles: true, button: 0, shiftKey: args?.shiftKey ?? false }),
  }, true);
}

function firePointerDoubleClick(node: Konva.Node) {
  node.fire("pointerdblclick", {
    evt: new MouseEvent("pointerdblclick", { bubbles: true, button: 0 }),
  }, true);
}

describe("new Select plugin", () => {
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

  test("shift pointerdown adds and removes top-level nodes from selection", async () => {
    const imageA = createImageElement({ id: "image-a", x: 30, y: 40, zIndex: "z00000000" });
    const imageB = createImageElement({ id: "image-b", x: 320, y: 190, zIndex: "z00000001" });
    const imageC = createImageElement({ id: "image-c", x: 520, y: 220, zIndex: "z00000002" });
    const docHandle = createMockDocHandle({
      elements: {
        [imageA.id]: imageA,
        [imageB.id]: imageB,
        [imageC.id]: imageC,
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    const selection = harness.runtime.services.require("selection");

    const nodeA = harness.staticForegroundLayer.findOne<Konva.Image>("#image-a")!;
    const nodeB = harness.staticForegroundLayer.findOne<Konva.Image>("#image-b")!;
    const nodeC = harness.staticForegroundLayer.findOne<Konva.Image>("#image-c")!;

    nodeA.fire("pointerdown", {
      evt: new MouseEvent("pointerdown", { bubbles: true, button: 0 }),
    }, true);
    await flushCanvasEffects();
    expect(selection.selection.map((node) => node.id())).toEqual([nodeA.id()]);

    nodeB.fire("pointerdown", {
      evt: new MouseEvent("pointerdown", { bubbles: true, button: 0, shiftKey: true }),
    }, true);
    await flushCanvasEffects();
    expect(selection.selection.map((node) => node.id())).toEqual([nodeA.id(), nodeB.id()]);

    nodeC.fire("pointerdown", {
      evt: new MouseEvent("pointerdown", { bubbles: true, button: 0, shiftKey: true }),
    }, true);
    await flushCanvasEffects();
    expect(selection.selection.map((node) => node.id())).toEqual([nodeA.id(), nodeB.id(), nodeC.id()]);

    nodeB.fire("pointerdown", {
      evt: new MouseEvent("pointerdown", { bubbles: true, button: 0, shiftKey: true }),
    }, true);
    await flushCanvasEffects();
    expect(selection.selection.map((node) => node.id())).toEqual([nodeA.id(), nodeC.id()]);

    await harness.destroy();
  });

  test("pointerdown focuses clicked node and empty stage clears focus", async () => {
    const imageA = createImageElement({ id: "image-a", x: 30, y: 40, zIndex: "z00000000" });
    const imageB = createImageElement({ id: "image-b", x: 320, y: 190, zIndex: "z00000001" });
    const docHandle = createMockDocHandle({
      elements: {
        [imageA.id]: imageA,
        [imageB.id]: imageB,
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    const selection = harness.runtime.services.require("selection");
    const render = harness.runtime.services.require("scene");

    const nodeA = harness.staticForegroundLayer.findOne<Konva.Image>("#image-a")!;

    nodeA.fire("pointerdown", {
      evt: new MouseEvent("pointerdown", { bubbles: true, button: 0 }),
    }, true);
    await flushCanvasEffects();
    expect(selection.focusedId).toBe(nodeA.id());

    const originalGetPos = render.dynamicLayer.getRelativePointerPosition.bind(render.dynamicLayer);
    render.dynamicLayer.getRelativePointerPosition = () => ({ x: 5, y: 5 });
    harness.runtime.hooks.pointerDown.call({ evt: new PointerEvent("pointerdown"), target: harness.stage } as any);
    render.dynamicLayer.getRelativePointerPosition = originalGetPos;
    await flushCanvasEffects();

    expect(selection.focusedId).toBeNull();
    expect(selection.selection).toEqual([]);

    await harness.destroy();
  });

  test("pointerdown on grouped image selects outer group", async () => {
    const imageA = createImageElement({ id: "image-a", x: 30, y: 40, zIndex: "z00000000" });
    const imageB = createImageElement({ id: "image-b", x: 320, y: 190, zIndex: "z00000001" });
    const docHandle = createMockDocHandle({
      elements: {
        [imageA.id]: imageA,
        [imageB.id]: imageB,
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    const selection = harness.runtime.services.require("selection");

    const nodeA = harness.staticForegroundLayer.findOne<Konva.Image>("#image-a")!;
    const nodeB = harness.staticForegroundLayer.findOne<Konva.Image>("#image-b")!;
    selection.setSelection([nodeA, nodeB]);
    selection.setFocusedNode(nodeB);
    fireGroupShortcut(harness.runtime);
    await flushCanvasEffects();

    const group = harness.staticForegroundLayer.findOne<Konva.Group>((candidate: Konva.Node) => candidate instanceof Konva.Group)!;
    firePointerDown(nodeA);
    await flushCanvasEffects();

    expect(selection.selection.map((node) => node.id())).toEqual([group.id()]);
    expect(selection.focusedId).toBe(group.id());

    await harness.destroy();
  });

  test("double click on nested image drills from outer group to inner group to leaf", async () => {
    const outerGroup = createGroup("group-outer", null, "z00000000");
    const innerGroup = createGroup("group-inner", outerGroup.id, "z00000000");
    const leafA = createImageElement({ id: "image-leaf-a", parentGroupId: innerGroup.id, zIndex: "z00000000" });
    const leafB = createImageElement({ id: "image-leaf-b", x: 360, y: 220, parentGroupId: outerGroup.id, zIndex: "z00000001" });

    const harness = await createNewCanvasHarness({
      docHandle: createMockDocHandle({
        groups: {
          [outerGroup.id]: outerGroup,
          [innerGroup.id]: innerGroup,
        },
        elements: {
          [leafA.id]: leafA,
          [leafB.id]: leafB,
        },
      }),
    });
    const selection = harness.runtime.services.require("selection");

    const outerNode = harness.staticForegroundLayer.findOne<Konva.Group>(`#${outerGroup.id}`)!;
    const innerNode = harness.staticForegroundLayer.findOne<Konva.Group>(`#${innerGroup.id}`)!;
    const leafNode = harness.staticForegroundLayer.findOne<Konva.Image>(`#${leafA.id}`)!;

    firePointerDown(leafNode);
    await flushCanvasEffects();
    expect(selection.selection.map((node) => node.id())).toEqual([outerNode.id()]);

    firePointerDoubleClick(leafNode);
    await flushCanvasEffects();
    expect(selection.selection.map((node) => node.id())).toEqual([outerNode.id(), innerNode.id()]);

    firePointerDoubleClick(leafNode);
    await flushCanvasEffects();
    expect(selection.selection.map((node) => node.id())).toEqual([outerNode.id(), innerNode.id(), leafNode.id()]);
    expect(selection.focusedId).toBe(leafNode.id());

    const transformer = harness.dynamicLayer.findOne<Konva.Transformer>("Transformer")!;
    expect(transformer.getNodes().map((node) => node.id())).toEqual([leafNode.id()]);

    const outerBoundary = harness.dynamicLayer.findOne<Konva.Rect>(`.group-boundary\:${outerNode.id()}`);
    const innerBoundary = harness.dynamicLayer.findOne<Konva.Rect>(`.group-boundary\:${innerNode.id()}`);
    expect(outerBoundary?.visible()).toBe(true);
    expect(innerBoundary?.visible()).toBe(true);

    await harness.destroy();
  });

  test("after drilling to leaf, pointerdown on sibling under outer group switches focus to sibling", async () => {
    const outerGroup = createGroup("group-outer", null, "z00000000");
    const innerGroup = createGroup("group-inner", outerGroup.id, "z00000000");
    const leafA = createImageElement({ id: "image-leaf-a", parentGroupId: innerGroup.id, zIndex: "z00000000" });
    const sibling = createImageElement({ id: "image-sibling", x: 420, y: 220, parentGroupId: outerGroup.id, zIndex: "z00000001" });

    const harness = await createNewCanvasHarness({
      docHandle: createMockDocHandle({
        groups: {
          [outerGroup.id]: outerGroup,
          [innerGroup.id]: innerGroup,
        },
        elements: {
          [leafA.id]: leafA,
          [sibling.id]: sibling,
        },
      }),
    });
    const selection = harness.runtime.services.require("selection");

    const outerNode = harness.staticForegroundLayer.findOne<Konva.Group>(`#${outerGroup.id}`)!;
    const innerNode = harness.staticForegroundLayer.findOne<Konva.Group>(`#${innerGroup.id}`)!;
    const leafNode = harness.staticForegroundLayer.findOne<Konva.Image>(`#${leafA.id}`)!;
    const siblingNode = harness.staticForegroundLayer.findOne<Konva.Image>(`#${sibling.id}`)!;

    firePointerDown(leafNode);
    await flushCanvasEffects();
    firePointerDoubleClick(leafNode);
    await flushCanvasEffects();
    firePointerDoubleClick(leafNode);
    await flushCanvasEffects();
    expect(selection.selection.map((node) => node.id())).toEqual([outerNode.id(), innerNode.id(), leafNode.id()]);

    firePointerDown(siblingNode);
    await flushCanvasEffects();
    expect(selection.selection.map((node) => node.id())).toEqual([outerNode.id(), siblingNode.id()]);
    expect(selection.focusedId).toBe(siblingNode.id());

    const transformer = harness.dynamicLayer.findOne<Konva.Transformer>("Transformer")!;
    expect(transformer.getNodes().map((node) => node.id())).toEqual([siblingNode.id()]);

    await harness.destroy();
  });
});
