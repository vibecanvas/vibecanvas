import Konva from "konva";
import type { DocHandle } from "@automerge/automerge-repo";
import type { TCanvasDoc, TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { describe, expect, test } from "vitest";
import { TextPlugin, TransformPlugin, type IPluginContext } from "../../../src/plugins";
import { createCanvasTestHarness, createMockDocHandle, exportStageSnapshot, flushCanvasEffects } from "../../test-setup";
import { dragShape, simulateTransformerResize } from "./helpers";

describe("TextPlugin – resize", () => {
  const snapshotDir = "tests/artifacts/text-plugin/resize";

  async function createResizeHarness() {
    let ctx!: IPluginContext;
    const docHandle = createMockDocHandle() as DocHandle<TCanvasDoc>;

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new TransformPlugin(), new TextPlugin()],
      initializeScene: (context) => {
        ctx = context;
        const textNode = new Konva.Text({
          id: "resize-text-1",
          x: 150,
          y: 150,
          width: 200,
          height: 60,
          text: "Resize me\nTwo lines",
          fontSize: 20,
          fontFamily: "Arial",
          wrap: "word",
        });
        textNode.draggable(true);
        TextPlugin.setupShapeListeners(context, textNode);
        context.staticForegroundLayer.add(textNode);
      },
    });

    const node = harness.staticForegroundLayer.findOne<Konva.Text>("#resize-text-1")!;
    return { harness, ctx, node, docHandle };
  }

  test("resize scales fontSize proportionally so layout is preserved", async () => {
    const { harness, ctx, node } = await createResizeHarness();
    const originalFontSize = node.fontSize();
    const originalWidth = node.width();

    ctx.setState("selection", [node]);
    await flushCanvasEffects();

    const transformer = harness.dynamicLayer.findOne<Konva.Transformer>("Transformer")!;
    simulateTransformerResize(transformer, node, { scaleX: 2, scaleY: 2 });
    await flushCanvasEffects();

    expect(node.fontSize()).toBeCloseTo(originalFontSize * 2, 1);
    expect(node.width()).toBeCloseTo(originalWidth * 2, 1);
    expect(node.scaleX()).toBeCloseTo(1, 5);
    expect(node.scaleY()).toBeCloseTo(1, 5);

    await exportStageSnapshot({
      stage: harness.stage,
      label: "resize scale – after 2x scale",
      relativeFilePath: `${snapshotDir}/04-fontsize-scaled.png`,
      waitMs: 60,
    });

    harness.destroy();
  });

  test("toTElement bakes scaleX/scaleY into width/height", () => {
    const node = new Konva.Text({ id: "bake-test", x: 50, y: 50, width: 200, height: 60, text: "hello", fontSize: 16, fontFamily: "Arial", scaleX: 1.5, scaleY: 2 });
    const el = TextPlugin.toTElement(node);
    const data = el.data as import("@vibecanvas/service-automerge/types/canvas-doc.types").TTextData;
    expect(data.w).toBeCloseTo(300, 5);
    expect(data.h).toBeCloseTo(120, 5);
  });

  test("updateTextFromElement restores baked dimensions and resets scale to 1", () => {
    const node = new Konva.Text({ id: "restore-test", x: 50, y: 50, width: 200, height: 60, text: "hello", fontSize: 16, fontFamily: "Arial", scaleX: 1.5, scaleY: 1.2 });
    const el = TextPlugin.toTElement(node);
    TextPlugin.updateTextFromElement(node, el);
    expect(node.scaleX()).toBeCloseTo(1, 5);
    expect(node.scaleY()).toBeCloseTo(1, 5);
    expect(node.width()).toBeCloseTo(300, 5);
    expect(node.height()).toBeCloseTo(72, 5);
  });

  test("absolute position is preserved after bake-in of scale", () => {
    const stage = new Konva.Stage({ container: document.createElement("div"), width: 800, height: 600 });
    const layer = new Konva.Layer();
    stage.add(layer);
    const node = new Konva.Text({ id: "abs-pos-test", x: 100, y: 120, width: 200, height: 60, text: "hello", fontSize: 16, fontFamily: "Arial" });
    layer.add(node);
    const absBefore = node.absolutePosition();
    node.scaleX(1.5);
    node.scaleY(1.2);
    const el = TextPlugin.toTElement(node);
    TextPlugin.updateTextFromElement(node, el);
    const absAfterBake = node.absolutePosition();
    expect(absAfterBake.x).toBeCloseTo(absBefore.x, 3);
    expect(absAfterBake.y).toBeCloseTo(absBefore.y, 3);
    stage.destroy();
  });

  test("resize undo restores original dimensions and position", async () => {
    const { harness, ctx, node } = await createResizeHarness();
    const originalAbsPos = { ...node.absolutePosition() };
    const originalW = node.width();
    const originalH = node.height();

    ctx.setState("selection", [node]);
    await flushCanvasEffects();

    const transformer = harness.dynamicLayer.findOne<Konva.Transformer>("Transformer")!;
    simulateTransformerResize(transformer, node, { scaleX: 1.5, scaleY: 1.5 });
    await flushCanvasEffects();

    expect(node.width()).toBeGreaterThan(originalW);
    const afterResizePos = node.absolutePosition();
    expect(afterResizePos.x).toBeCloseTo(originalAbsPos.x, 1);
    expect(afterResizePos.y).toBeCloseTo(originalAbsPos.y, 1);

    ctx.history.undo();
    await flushCanvasEffects();
    expect(node.width()).toBeCloseTo(originalW, 1);
    expect(node.height()).toBeCloseTo(originalH, 1);

    harness.destroy();
  });
});

describe("TextPlugin – drag undo", () => {
  test("drag a text node then undo restores original position", async () => {
    let ctx!: IPluginContext;
    const harness = await createCanvasTestHarness({
      plugins: [new TextPlugin()],
      initializeScene: (context) => {
        ctx = context;
        const textNode = new Konva.Text({ id: "drag-text-1", x: 50, y: 60, width: 200, height: 30, text: "drag me", fontSize: 16, fontFamily: "Arial" });
        textNode.draggable(true);
        TextPlugin.setupShapeListeners(context, textNode);
        context.staticForegroundLayer.add(textNode);
      },
    });

    const node = harness.staticForegroundLayer.findOne<Konva.Text>("#drag-text-1")!;
    const startPos = { ...node.absolutePosition() };
    dragShape(node, { deltaX: 100, deltaY: 50 });
    expect(node.absolutePosition().x).toBeCloseTo(startPos.x + 100, 1);
    expect(ctx.history.canUndo()).toBe(true);
    ctx.history.undo();
    await flushCanvasEffects();
    expect(node.absolutePosition().x).toBeCloseTo(startPos.x, 1);
    ctx.history.redo();
    await flushCanvasEffects();
    expect(node.absolutePosition().x).toBeCloseTo(startPos.x + 100, 1);
    harness.destroy();
  });
});

describe("TextPlugin – CRDT persistence", () => {
  test("entering edit mode and committing text patches CRDT with correct TTextData", async () => {
    let ctx!: IPluginContext;
    const docHandle = createMockDocHandle() as DocHandle<TCanvasDoc>;

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new TextPlugin()],
      initializeScene: (context) => {
        ctx = context;
        const textNode = new Konva.Text({ id: "crdt-text-1", x: 100, y: 100, width: 200, height: 30, text: "", fontSize: 16, fontFamily: "Arial" });
        TextPlugin.setupShapeListeners(context, textNode);
        context.staticForegroundLayer.add(textNode);
      },
    });

    const node = harness.staticForegroundLayer.findOne<Konva.Text>("#crdt-text-1")!;
    TextPlugin.enterEditMode(ctx, node, false);
    const textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "Hello CRDT";
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    const data = docHandle.doc().elements["crdt-text-1"].data as import("@vibecanvas/service-automerge/types/canvas-doc.types").TTextData;
    expect(data.text).toBe("Hello CRDT");
    harness.destroy();
  });

  test("multiline text is persisted correctly to CRDT", async () => {
    let ctx!: IPluginContext;
    const docHandle = createMockDocHandle() as DocHandle<TCanvasDoc>;

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new TextPlugin()],
      initializeScene: (context) => {
        ctx = context;
        const textNode = new Konva.Text({ id: "crdt-nl-1", x: 100, y: 100, width: 200, height: 30, text: "", fontSize: 16, fontFamily: "Arial" });
        TextPlugin.setupShapeListeners(context, textNode);
        context.staticForegroundLayer.add(textNode);
      },
    });

    const node = harness.staticForegroundLayer.findOne<Konva.Text>("#crdt-nl-1")!;
    TextPlugin.enterEditMode(ctx, node, false);
    const textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "first line\nsecond line\nthird line";
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    const data = docHandle.doc().elements["crdt-nl-1"].data as import("@vibecanvas/service-automerge/types/canvas-doc.types").TTextData;
    expect(data.text.split("\n")).toHaveLength(3);
    harness.destroy();
  });

  test("Escape commits text on a new node instead of discarding the edit", async () => {
    let ctx!: IPluginContext;
    const harness = await createCanvasTestHarness({
      plugins: [new TextPlugin()],
      initializeScene: (context) => {
        ctx = context;
        const textNode = new Konva.Text({ id: "escape-text-1", x: 100, y: 100, width: 200, height: 30, text: "", fontSize: 16, fontFamily: "Arial" });
        TextPlugin.setupShapeListeners(context, textNode);
        context.staticForegroundLayer.add(textNode);
      },
    });

    const nodeBefore = harness.staticForegroundLayer.findOne<Konva.Text>("#escape-text-1")!;
    TextPlugin.enterEditMode(ctx, nodeBefore, true);
    const textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "committed by escape";
    textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await flushCanvasEffects();

    const nodeAfter = harness.staticForegroundLayer.findOne<Konva.Text>("#escape-text-1")!;
    expect(nodeAfter.text()).toBe("committed by escape");
    harness.destroy();
  });
});

describe("TextPlugin – hydration capability", () => {
  test("createShapeFromTElement with type 'text' creates a Konva.Text", async () => {
    let ctx!: IPluginContext;
    const harness = await createCanvasTestHarness({ plugins: [new TextPlugin()], initializeScene: (context) => { ctx = context; } });

    const element: TElement = {
      id: "text-hydrate-1", x: 50, y: 80, rotation: 0, bindings: [], locked: false, parentGroupId: null, zIndex: "", createdAt: Date.now(), updatedAt: Date.now(), style: {},
      data: { type: "text", w: 200, h: 40, text: "Hello world", originalText: "Hello world", fontSize: 16, fontFamily: "Arial", textAlign: "left", verticalAlign: "top", lineHeight: 1.2, link: null, containerId: null, autoResize: false },
    };

    const node = ctx.capabilities.createShapeFromTElement?.(element) as Konva.Text;
    expect(node.text()).toBe("Hello world");
    harness.destroy();
  });

  test("hydrated text with newlines preserves newlines in Konva.Text", async () => {
    let ctx!: IPluginContext;
    const harness = await createCanvasTestHarness({ plugins: [new TextPlugin()], initializeScene: (context) => { ctx = context; } });

    const element: TElement = {
      id: "text-hydrate-nl", x: 50, y: 80, rotation: 0, bindings: [], locked: false, parentGroupId: null, zIndex: "", createdAt: Date.now(), updatedAt: Date.now(), style: {},
      data: { type: "text", w: 200, h: 80, text: "line one\nline two\nline three", originalText: "line one\nline two\nline three", fontSize: 16, fontFamily: "Arial", textAlign: "left", verticalAlign: "top", lineHeight: 1.2, link: null, containerId: null, autoResize: false },
    };

    const node = ctx.capabilities.createShapeFromTElement?.(element) as Konva.Text;
    expect(node.text()).toContain("\n");
    harness.destroy();
  });
});

describe("TextPlugin – toTElement", () => {
  test("serializes a Konva.Text node to TElement correctly", () => {
    const node = new Konva.Text({ id: "t1", x: 10, y: 20, width: 150, height: 30, text: "hi", fontSize: 18, fontFamily: "Arial", align: "left", verticalAlign: "top", lineHeight: 1.2 });
    const el = TextPlugin.toTElement(node);
    const data = el.data as import("@vibecanvas/service-automerge/types/canvas-doc.types").TTextData;
    expect(data.text).toBe("hi");
    expect(data.fontSize).toBe(18);
    expect(data.textAlign).toBe("left");
  });

  test("serializes multiline text with newlines intact", () => {
    const node = new Konva.Text({ id: "t2", x: 0, y: 0, width: 200, height: 80, text: "line1\nline2\nline3", fontSize: 16, fontFamily: "Arial" });
    const el = TextPlugin.toTElement(node);
    const data = el.data as import("@vibecanvas/service-automerge/types/canvas-doc.types").TTextData;
    expect(data.text.split("\n")).toHaveLength(3);
  });
});
