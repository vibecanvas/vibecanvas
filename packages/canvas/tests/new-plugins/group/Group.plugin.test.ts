import Konva from "konva";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";
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
    style: {
      opacity: 1,
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

function fireGroupShortcut(runtime: Awaited<ReturnType<typeof createNewCanvasHarness>>["runtime"], args?: { shiftKey?: boolean }) {
  const event = new KeyboardEvent("keydown", {
    key: "g",
    metaKey: true,
    shiftKey: args?.shiftKey ?? false,
    bubbles: true,
    cancelable: true,
  });
  runtime.hooks.keydown.call(event);
}

describe("new Group plugin", () => {
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

  test("grouping preserves child absolute positions under camera pan and zoom", async () => {
    const imageA = createImageElement({ id: "image-a", x: 30, y: 40, zIndex: "z00000000" });
    const imageB = createImageElement({ id: "image-b", x: 320, y: 190, zIndex: "z00000001" });
    const docHandle = createMockDocHandle({
      elements: {
        [imageA.id]: imageA,
        [imageB.id]: imageB,
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    const camera = harness.runtime.services.require("camera");
    const selection = harness.runtime.services.require("selection");

    const nodeA = harness.staticForegroundLayer.findOne<Konva.Image>("#image-a");
    const nodeB = harness.staticForegroundLayer.findOne<Konva.Image>("#image-b");
    expect(nodeA).toBeTruthy();
    expect(nodeB).toBeTruthy();

    camera.pan(-120, -75);
    camera.zoomAtScreenPoint(1.35, { x: 250, y: 180 });
    await flushCanvasEffects();

    const absBeforeA = nodeA!.getAbsolutePosition();
    const absBeforeB = nodeB!.getAbsolutePosition();

    selection.setSelection([nodeA!, nodeB!]);
    selection.setFocusedNode(nodeB!);
    fireGroupShortcut(harness.runtime);
    await flushCanvasEffects();

    const group = harness.staticForegroundLayer.findOne<Konva.Group>((candidate: Konva.Node) => candidate instanceof Konva.Group);
    expect(group).toBeTruthy();
    expect(nodeA!.getParent()).toBe(group);
    expect(nodeB!.getParent()).toBe(group);
    expect(nodeA!.getAbsolutePosition().x).toBeCloseTo(absBeforeA.x, 6);
    expect(nodeA!.getAbsolutePosition().y).toBeCloseTo(absBeforeA.y, 6);
    expect(nodeB!.getAbsolutePosition().x).toBeCloseTo(absBeforeB.x, 6);
    expect(nodeB!.getAbsolutePosition().y).toBeCloseTo(absBeforeB.y, 6);
    expect(docHandle.doc().groups[group!.id()]).toBeTruthy();
    expect(docHandle.doc().elements[imageA.id]?.parentGroupId).toBe(group!.id());
    expect(docHandle.doc().elements[imageB.id]?.parentGroupId).toBe(group!.id());

    await harness.destroy();
  });

  test("ungroup preserves child absolute positions and clears parentGroupId", async () => {
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
    const absBeforeA = nodeA.getAbsolutePosition();
    const absBeforeB = nodeB.getAbsolutePosition();

    selection.setSelection([group]);
    selection.setFocusedNode(group);
    fireGroupShortcut(harness.runtime, { shiftKey: true });
    await flushCanvasEffects();

    expect(nodeA.getParent()).toBe(harness.staticForegroundLayer);
    expect(nodeB.getParent()).toBe(harness.staticForegroundLayer);
    expect(nodeA.getAbsolutePosition().x).toBeCloseTo(absBeforeA.x, 6);
    expect(nodeA.getAbsolutePosition().y).toBeCloseTo(absBeforeA.y, 6);
    expect(nodeB.getAbsolutePosition().x).toBeCloseTo(absBeforeB.x, 6);
    expect(nodeB.getAbsolutePosition().y).toBeCloseTo(absBeforeB.y, 6);
    expect(docHandle.doc().groups[group.id()]).toBeUndefined();
    expect(docHandle.doc().elements[imageA.id]?.parentGroupId).toBeNull();
    expect(docHandle.doc().elements[imageB.id]?.parentGroupId).toBeNull();

    await harness.destroy();
  });

  test.skip("grouping preserves stack slot and ungroup restores child order", async () => {
    const imageA = createImageElement({ id: "image-a", x: 10, y: 10, zIndex: "z00000000" });
    const imageB = createImageElement({ id: "image-b", x: 70, y: 10, zIndex: "z00000001" });
    const imageC = createImageElement({ id: "image-c", x: 130, y: 10, zIndex: "z00000002" });
    const imageD = createImageElement({ id: "image-d", x: 190, y: 10, zIndex: "z00000003" });
    const docHandle = createMockDocHandle({
      elements: {
        [imageA.id]: imageA,
        [imageB.id]: imageB,
        [imageC.id]: imageC,
        [imageD.id]: imageD,
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    const selection = harness.runtime.services.require("selection");

    const nodeA = harness.staticForegroundLayer.findOne<Konva.Image>("#image-a")!;
    const nodeB = harness.staticForegroundLayer.findOne<Konva.Image>("#image-b")!;
    const nodeC = harness.staticForegroundLayer.findOne<Konva.Image>("#image-c")!;
    const nodeD = harness.staticForegroundLayer.findOne<Konva.Image>("#image-d")!;

    expect(harness.staticForegroundLayer.getChildren().filter((node) => node instanceof Konva.Group || node instanceof Konva.Image).map((node) => node.id()))
      .toEqual([nodeA.id(), nodeB.id(), nodeC.id(), nodeD.id()]);

    selection.setSelection([nodeB, nodeC]);
    selection.setFocusedNode(nodeC);
    fireGroupShortcut(harness.runtime);
    await flushCanvasEffects();

    const group = harness.staticForegroundLayer.findOne<Konva.Group>((candidate: Konva.Node) => candidate instanceof Konva.Group)!;
    const groupedOrder = harness.staticForegroundLayer.getChildren()
      .filter((node) => node instanceof Konva.Group || node instanceof Konva.Image)
      .map((node) => node.id());
    expect(groupedOrder).toEqual([nodeA.id(), group.id(), nodeD.id()]);

    selection.setSelection([group]);
    selection.setFocusedNode(group);
    fireGroupShortcut(harness.runtime, { shiftKey: true });
    await flushCanvasEffects();

    const ungroupedOrder = harness.staticForegroundLayer.getChildren()
      .filter((node) => node instanceof Konva.Group || node instanceof Konva.Image)
      .map((node) => node.id());
    expect(ungroupedOrder).toEqual([nodeA.id(), nodeB.id(), nodeC.id(), nodeD.id()]);

    await harness.destroy();
  });

  test.skip("dragging one selected node moves all selected roots and undo restores them", async () => {
    const imageA = createImageElement({ id: "image-a", x: 40, y: 60, zIndex: "z00000000" });
    const imageB = createImageElement({ id: "image-b", x: 150, y: 90, zIndex: "z00000001" });
    const imageC = createImageElement({ id: "image-c", x: 420, y: 120, zIndex: "z00000002" });
    const docHandle = createMockDocHandle({
      elements: {
        [imageA.id]: imageA,
        [imageB.id]: imageB,
        [imageC.id]: imageC,
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    const history = harness.runtime.services.require("history");
    const selection = harness.runtime.services.require("selection");

    const nodeA = harness.staticForegroundLayer.findOne<Konva.Image>("#image-a")!;
    const nodeB = harness.staticForegroundLayer.findOne<Konva.Image>("#image-b")!;
    const nodeC = harness.staticForegroundLayer.findOne<Konva.Image>("#image-c")!;

    selection.setSelection([nodeA, nodeB]);
    selection.setFocusedNode(nodeB);
    fireGroupShortcut(harness.runtime);
    await flushCanvasEffects();

    const group = harness.staticForegroundLayer.findOne<Konva.Group>((candidate: Konva.Node) => candidate instanceof Konva.Group)!;
    const groupStart = { ...group.absolutePosition() };
    const imageCStart = { ...nodeC.absolutePosition() };

    selection.setSelection([group, nodeC]);
    selection.setFocusedNode(nodeC);
    await flushCanvasEffects();

    nodeC.fire("dragstart", {
      target: nodeC,
      currentTarget: nodeC,
      evt: new MouseEvent("dragstart", { bubbles: true }),
    });
    nodeC.setAbsolutePosition({ x: imageCStart.x + 90, y: imageCStart.y + 20 });
    nodeC.fire("dragmove", {
      target: nodeC,
      currentTarget: nodeC,
      evt: new MouseEvent("dragmove", { bubbles: true }),
    });
    nodeC.fire("dragend", {
      target: nodeC,
      currentTarget: nodeC,
      evt: new MouseEvent("dragend", { bubbles: true }),
    });
    await flushCanvasEffects();

    expect(nodeC.absolutePosition().x).toBeCloseTo(imageCStart.x + 90, 2);
    expect(nodeC.absolutePosition().y).toBeCloseTo(imageCStart.y + 20, 2);
    expect(group.absolutePosition().x).toBeCloseTo(groupStart.x + 90, 2);
    expect(group.absolutePosition().y).toBeCloseTo(groupStart.y + 20, 2);

    history.undo();
    await flushCanvasEffects();

    expect(nodeC.absolutePosition().x).toBeCloseTo(imageCStart.x, 2);
    expect(nodeC.absolutePosition().y).toBeCloseTo(imageCStart.y, 2);
    expect(group.absolutePosition().x).toBeCloseTo(groupStart.x, 2);
    expect(group.absolutePosition().y).toBeCloseTo(groupStart.y, 2);

    await harness.destroy();
  });

  test("group and ungroup support undo and redo", async () => {
    const imageA = createImageElement({ id: "image-a", x: 30, y: 40, zIndex: "z00000000" });
    const imageB = createImageElement({ id: "image-b", x: 320, y: 190, zIndex: "z00000001" });
    const docHandle = createMockDocHandle({
      elements: {
        [imageA.id]: imageA,
        [imageB.id]: imageB,
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    const history = harness.runtime.services.require("history");
    const selection = harness.runtime.services.require("selection");

    const nodeA = harness.staticForegroundLayer.findOne<Konva.Image>("#image-a")!;
    const nodeB = harness.staticForegroundLayer.findOne<Konva.Image>("#image-b")!;

    selection.setSelection([nodeA, nodeB]);
    selection.setFocusedNode(nodeB);
    fireGroupShortcut(harness.runtime);
    await flushCanvasEffects();

    const group = harness.staticForegroundLayer.findOne<Konva.Group>((candidate: Konva.Node) => candidate instanceof Konva.Group)!;
    expect(history.canUndo()).toBe(true);
    expect(docHandle.doc().groups[group.id()]).toBeTruthy();

    history.undo();
    await flushCanvasEffects();
    expect(harness.staticForegroundLayer.findOne(`#${group.id()}`)).toBeFalsy();
    expect(nodeA.getParent()).toBe(harness.staticForegroundLayer);
    expect(nodeB.getParent()).toBe(harness.staticForegroundLayer);
    expect(docHandle.doc().groups[group.id()]).toBeUndefined();

    history.redo();
    await flushCanvasEffects();
    const regrouped = harness.staticForegroundLayer.findOne<Konva.Group>(`#${group.id()}`);
    expect(regrouped).toBeTruthy();
    expect(docHandle.doc().groups[group.id()]).toBeTruthy();

    selection.setSelection([regrouped!]);
    selection.setFocusedNode(regrouped!);
    fireGroupShortcut(harness.runtime, { shiftKey: true });
    await flushCanvasEffects();

    expect(harness.staticForegroundLayer.findOne(`#${group.id()}`)).toBeFalsy();
    expect(docHandle.doc().groups[group.id()]).toBeUndefined();
    expect(nodeA.getParent()).toBe(harness.staticForegroundLayer);
    expect(nodeB.getParent()).toBe(harness.staticForegroundLayer);

    history.undo();
    await flushCanvasEffects();
    expect(harness.staticForegroundLayer.findOne<Konva.Group>(`#${group.id()}`)).toBeTruthy();
    history.redo();
    await flushCanvasEffects();
    expect(harness.staticForegroundLayer.findOne(`#${group.id()}`)).toBeFalsy();

    await harness.destroy();
  });
});
