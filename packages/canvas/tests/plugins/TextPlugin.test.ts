import Konva from "konva";
import type { DocHandle } from "@automerge/automerge-repo";
import type { TCanvasDoc, TElement } from "@vibecanvas/shell/automerge/index";
import { describe, expect, test } from "vitest";
import { TextPlugin } from "../../src/plugins/Text.plugin";
import { GroupPlugin } from "../../src/plugins/Group.plugin";
import { TransformPlugin } from "../../src/plugins/Transform.plugin";
import { SelectPlugin } from "../../src/plugins/Select.plugin";
import { Shape2dPlugin } from "../../src/plugins/Shape2d.plugin";
import { EventListenerPlugin } from "../../src/plugins/EventListener.plugin";
import { CameraControlPlugin } from "../../src/plugins/CameraControl.plugin";
import { HistoryControlPlugin } from "../../src/plugins/HistoryControl.plugin";
import { HelpPlugin } from "../../src/plugins/Help.plugin";
import { ToolbarPlugin } from "../../src/plugins/Toolbar.plugin";
import { GridPlugin } from "../../src/plugins/Grid.plugin";
import type { IPluginContext } from "../../src/plugins/interface";
import { CanvasMode } from "../../src/services/canvas/enum";
import { CustomEvents } from "../../src/custom-events";
import { initializeScene05GroupWithTextAndRect } from "../scenarios/05-group-with-text-and-rect";
import {
  createCanvasTestHarness,
  createMockDocHandle,
  exportStageSnapshot,
  flushCanvasEffects,
} from "../test-setup";

function createFullPluginStack() {
  const groupPlugin = new GroupPlugin();
  return {
    groupPlugin,
    plugins: [
      new EventListenerPlugin(),
      new GridPlugin(),
      new CameraControlPlugin(),
      new HistoryControlPlugin(),
      new ToolbarPlugin(() => {}),
      new HelpPlugin(),
      new SelectPlugin(),
      new TransformPlugin(),
      new Shape2dPlugin(),
      new TextPlugin(),
      groupPlugin,
    ],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function firePointerUp(context: IPluginContext, x: number, y: number) {
  const layer = context.staticForegroundLayer;
  const originalGetPos = layer.getRelativePointerPosition.bind(layer);
  layer.getRelativePointerPosition = () => ({ x, y });

  context.hooks.pointerUp.call({
    target: context.stage,
    currentTarget: context.stage,
    evt: new PointerEvent("pointerup"),
    cancelBubble: false,
  } as unknown as Konva.KonvaEventObject<PointerEvent>);

  layer.getRelativePointerPosition = originalGetPos;
}

function dragShape(shape: Konva.Shape, args: { deltaX: number; deltaY?: number }) {
  const beforePos = shape.absolutePosition();
  shape.fire("dragstart", {
    target: shape,
    currentTarget: shape,
    evt: new MouseEvent("dragstart", { bubbles: true }),
  });
  shape.setAbsolutePosition({ x: beforePos.x + args.deltaX, y: beforePos.y + (args.deltaY ?? 0) });
  shape.fire("dragmove", {
    target: shape,
    currentTarget: shape,
    evt: new MouseEvent("dragmove", { bubbles: true }),
  });
  shape.fire("dragend", {
    target: shape,
    currentTarget: shape,
    evt: new MouseEvent("dragend", { bubbles: true }),
  });
}

function altDragNode(node: Konva.Node, args: { deltaX: number; deltaY?: number }) {
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
    .find((child) => !beforeNodeIds.has(child._id) && child.constructor === node.constructor);

  if (!previewClone) {
    throw new Error("Expected preview clone after alt-drag start");
  }

  const beforePos = previewClone.absolutePosition();
  previewClone.setAbsolutePosition({
    x: beforePos.x + args.deltaX,
    y: beforePos.y + (args.deltaY ?? 0),
  });
  previewClone.fire("dragend", {
    target: previewClone,
    currentTarget: previewClone,
    evt: new MouseEvent("dragend", { bubbles: true, altKey: true }),
  });
}

/** Simulate a transformer resize by directly applying scale then calling transformend. */
function simulateTransformerResize(
  transformer: Konva.Transformer,
  node: Konva.Text,
  args: { scaleX: number; scaleY: number }
) {
  transformer.fire("transformstart", { target: node, currentTarget: transformer, evt: {} as Event });

  const prevScaleX = node.scaleX();
  const prevScaleY = node.scaleY();
  node.scaleX(prevScaleX * args.scaleX);
  node.scaleY(prevScaleY * args.scaleY);

  // Fire the transform event on the node so the bake handler runs
  // (in real Konva the transformer fires this during each pointer-move tick)
  node.fire("transform", { target: node, currentTarget: node, evt: {} as Event });

  transformer.fire("transformend", { target: node, currentTarget: transformer, evt: {} as Event });
}

// ---------------------------------------------------------------------------
// Tests: Click-create
// ---------------------------------------------------------------------------

describe("TextPlugin – click-create", () => {
  test("pointerUp in CLICK_CREATE + text mode adds a Konva.Text to staticForegroundLayer", async () => {
    let ctx!: IPluginContext;

    const harness = await createCanvasTestHarness({
      plugins: [new TextPlugin()],
      initializeScene: (context) => {
        ctx = context;
      },
    });

    ctx.setState("mode", CanvasMode.CLICK_CREATE);
    ctx.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "text");

    const textNodesBefore = harness.staticForegroundLayer
      .getChildren()
      .filter((n) => n instanceof Konva.Text);

    firePointerUp(ctx, 100, 150);
    await flushCanvasEffects();

    expect(ctx.state.mode).toBe(CanvasMode.SELECT);

    const textNodesAfter = harness.staticForegroundLayer
      .getChildren()
      .filter((n) => n instanceof Konva.Text);

    expect(textNodesAfter.length).toBe(textNodesBefore.length + 1);

    const added = textNodesAfter[textNodesAfter.length - 1] as Konva.Text;
    expect(added.x()).toBeCloseTo(100, 0);
    expect(added.y()).toBeCloseTo(150, 0);

    harness.destroy();
  });

  test("new text edit box opens at single-line height", async () => {
    let ctx!: IPluginContext;

    const harness = await createCanvasTestHarness({
      plugins: [new TextPlugin()],
      initializeScene: (context) => {
        ctx = context;
      },
    });

    ctx.setState("mode", CanvasMode.CLICK_CREATE);
    ctx.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "text");

    firePointerUp(ctx, 100, 150);
    await flushCanvasEffects();

    const added = harness.staticForegroundLayer.findOne<Konva.Text>("Text")!;
    const textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;

    expect(textarea).not.toBeNull();
    expect(textarea.rows).toBe(1);
    expect(parseFloat(textarea.style.height)).toBeCloseTo(TextPlugin.computeTextHeight(added, ""), 0);

    textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await flushCanvasEffects();

    harness.destroy();
  });

  test("pointerUp in DRAW_CREATE mode is ignored", async () => {
    let ctx!: IPluginContext;

    const harness = await createCanvasTestHarness({
      plugins: [new TextPlugin()],
      initializeScene: (context) => {
        ctx = context;
      },
    });

    ctx.setState("mode", CanvasMode.DRAW_CREATE);
    ctx.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "text");

    const before = harness.staticForegroundLayer.getChildren().length;
    firePointerUp(ctx, 100, 150);
    await flushCanvasEffects();

    expect(harness.staticForegroundLayer.getChildren().length).toBe(before);

    harness.destroy();
  });
});

// ---------------------------------------------------------------------------
// Tests: Newline and whitespace preservation
// ---------------------------------------------------------------------------

describe("TextPlugin – newline and whitespace", () => {
  const snapshotDir = "tests/artifacts/text-plugin/newline";

  test("committing multiline text preserves newlines in Konva.Text node", async () => {
    let ctx!: IPluginContext;
    const docHandle = createMockDocHandle() as DocHandle<TCanvasDoc>;

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new TextPlugin()],
      initializeScene: (context) => {
        ctx = context;
        const textNode = new Konva.Text({
          id: "nl-text-1",
          x: 100,
          y: 100,
          width: 200,
          height: 30,
          text: "",
          fontSize: 16,
          fontFamily: "Arial",
          wrap: "word",
        });
        TextPlugin.setupShapeListeners(context, textNode);
        context.staticForegroundLayer.add(textNode);
      },
    });

    const node = harness.staticForegroundLayer.findOne<Konva.Text>("#nl-text-1")!;

    await exportStageSnapshot({
      stage: harness.stage,
      label: "newline test – before edit",
      relativeFilePath: `${snapshotDir}/01-before-edit.png`,
      waitMs: 60,
    });

    TextPlugin.enterEditMode(ctx, node, false);
    const textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();

    // Textarea should preserve explicit newlines/whitespace without forced wrapping
    expect(textarea.style.whiteSpace).toBe("pre");

    textarea.value = "Hello\nWorld\n  indented";
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    await exportStageSnapshot({
      stage: harness.stage,
      label: "newline test – after commit multiline",
      relativeFilePath: `${snapshotDir}/02-after-commit.png`,
      waitMs: 60,
    });

    // Newlines must be preserved — NOT trimmed
    expect(node.text()).toBe("Hello\nWorld\n  indented");
    expect(node.text()).toContain("\n");

    // CRDT must have the newlines too
    const doc = docHandle.doc();
    const el = doc.elements["nl-text-1"];
    expect(el).toBeTruthy();
    const data = el.data as import("@vibecanvas/shell/automerge/index").TTextData;
    expect(data.text).toBe("Hello\nWorld\n  indented");

    harness.destroy();
  });

  test("textarea is auto-sized on open to show all existing lines without scrolling", async () => {
    let ctx!: IPluginContext;

    const harness = await createCanvasTestHarness({
      plugins: [new TextPlugin()],
      initializeScene: (context) => {
        ctx = context;
        const textNode = new Konva.Text({
          id: "autogrow-open-1",
          x: 100,
          y: 100,
          width: 200,
          height: 80,
          text: "first line\nsecond line\nthird line",
          fontSize: 16,
          fontFamily: "Arial",
          wrap: "word",
        });
        TextPlugin.setupShapeListeners(context, textNode);
        context.staticForegroundLayer.add(textNode);
      },
    });

    const node = harness.staticForegroundLayer.findOne<Konva.Text>("#autogrow-open-1")!;

    TextPlugin.enterEditMode(ctx, node, false);

    const textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();

    // After autoGrow() on open, textarea height should be >= scrollHeight (no hidden lines)
    const heightPx = parseFloat(textarea.style.height);
    // scrollHeight is 0 in JSDOM (no layout), but height must be a positive number
    // derived from node.height() or scrollHeight — not stuck at 0 or minHeight
    expect(heightPx).toBeGreaterThan(0);

    // The textarea value must preserve all three lines exactly
    expect(textarea.value).toBe("first line\nsecond line\nthird line");

    // Escape now accepts the current value and closes edit mode
    textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await flushCanvasEffects();
    expect(ctx.stage.container().querySelector("textarea")).toBeNull();
    expect(node.visible()).toBe(true);

    harness.destroy();
  });

  test("leading and trailing whitespace is preserved (no implicit trim)", async () => {
    let ctx!: IPluginContext;
    const docHandle = createMockDocHandle() as DocHandle<TCanvasDoc>;

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new TextPlugin()],
      initializeScene: (context) => {
        ctx = context;
        const textNode = new Konva.Text({
          id: "ws-text-1",
          x: 100,
          y: 200,
          width: 200,
          height: 30,
          text: "",
          fontSize: 16,
          fontFamily: "Arial",
        });
        TextPlugin.setupShapeListeners(context, textNode);
        context.staticForegroundLayer.add(textNode);
      },
    });

    const node = harness.staticForegroundLayer.findOne<Konva.Text>("#ws-text-1")!;

    TextPlugin.enterEditMode(ctx, node, false);
    const textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;

    // Text with leading/trailing spaces
    textarea.value = "  spaces  ";
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    expect(node.text()).toBe("  spaces  ");

    harness.destroy();
  });

  test("undo after multiline edit restores original text", async () => {
    let ctx!: IPluginContext;
    const docHandle = createMockDocHandle() as DocHandle<TCanvasDoc>;

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new TextPlugin()],
      initializeScene: (context) => {
        ctx = context;
        const textNode = new Konva.Text({
          id: "undo-nl-text-1",
          x: 100,
          y: 300,
          width: 200,
          height: 50,
          text: "original",
          fontSize: 16,
          fontFamily: "Arial",
        });
        TextPlugin.setupShapeListeners(context, textNode);
        context.staticForegroundLayer.add(textNode);
      },
    });

    const node = harness.staticForegroundLayer.findOne<Konva.Text>("#undo-nl-text-1")!;

    await exportStageSnapshot({
      stage: harness.stage,
      label: "undo newline – before edit",
      relativeFilePath: `${snapshotDir}/03-undo-before.png`,
      waitMs: 60,
    });

    TextPlugin.enterEditMode(ctx, node, false);
    const textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "line1\nline2\nline3";
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    expect(node.text()).toBe("line1\nline2\nline3");

    await exportStageSnapshot({
      stage: harness.stage,
      label: "undo newline – after edit",
      relativeFilePath: `${snapshotDir}/04-undo-after-edit.png`,
      waitMs: 60,
    });

    ctx.history.undo();
    await flushCanvasEffects();

    expect(node.text()).toBe("original");

    await exportStageSnapshot({
      stage: harness.stage,
      label: "undo newline – after undo",
      relativeFilePath: `${snapshotDir}/05-undo-after-undo.png`,
      waitMs: 60,
    });

    ctx.history.redo();
    await flushCanvasEffects();

    expect(node.text()).toBe("line1\nline2\nline3");

    harness.destroy();
  });
});

// ---------------------------------------------------------------------------
// Tests: Resize (keepRatio + position preservation)
// ---------------------------------------------------------------------------

describe("TextPlugin – resize", () => {
  const snapshotDir = "tests/artifacts/text-plugin/resize";

  async function createResizeHarness() {
    let ctx!: IPluginContext;
    const docHandle = createMockDocHandle() as DocHandle<TCanvasDoc>;

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [
        new TransformPlugin(),
        new TextPlugin(),
      ],
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
    expect(node).toBeInstanceOf(Konva.Text);

    return { harness, ctx, node, docHandle };
  }

  test("resize scales fontSize proportionally so layout is preserved", async () => {
    const { harness, ctx, node } = await createResizeHarness();

    const originalFontSize = node.fontSize();
    const originalWidth = node.width();

    ctx.setState("selection", [node]);
    await flushCanvasEffects();

    const transformer = harness.dynamicLayer.findOne<Konva.Transformer>("Transformer");
    if (transformer) {
      simulateTransformerResize(transformer, node, { scaleX: 2, scaleY: 2 });
    } else {
      // Fallback: fire transform event directly
      node.scaleX(2);
      node.scaleY(2);
      node.fire("transform", { target: node, currentTarget: node, evt: {} as Event });
    }

    await flushCanvasEffects();

    // fontSize should have scaled by the same factor as the box
    expect(node.fontSize()).toBeCloseTo(originalFontSize * 2, 1);
    expect(node.width()).toBeCloseTo(originalWidth * 2, 1);
    // scale is baked in — no residual scale on the node
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
    const node = new Konva.Text({
      id: "bake-test",
      x: 50,
      y: 50,
      width: 200,
      height: 60,
      text: "hello",
      fontSize: 16,
      fontFamily: "Arial",
      scaleX: 1.5,
      scaleY: 2,
    });

    const el = TextPlugin.toTElement(node);
    const data = el.data as import("@vibecanvas/shell/automerge/index").TTextData;

    // w and h should bake in the scale
    expect(data.w).toBeCloseTo(200 * 1.5, 5);
    expect(data.h).toBeCloseTo(60 * 2, 5);
  });

  test("updateTextFromElement restores baked dimensions and resets scale to 1", () => {
    const node = new Konva.Text({
      id: "restore-test",
      x: 50,
      y: 50,
      width: 200,
      height: 60,
      text: "hello",
      fontSize: 16,
      fontFamily: "Arial",
      scaleX: 1.5,
      scaleY: 1.2,
    });

    const el = TextPlugin.toTElement(node);
    // Simulate what TransformPlugin does: apply element back
    TextPlugin.updateTextFromElement(node, el);

    expect(node.scaleX()).toBeCloseTo(1, 5);
    expect(node.scaleY()).toBeCloseTo(1, 5);
    expect(node.width()).toBeCloseTo(200 * 1.5, 5);
    expect(node.height()).toBeCloseTo(60 * 1.2, 5);
  });

  test("absolute position is preserved after bake-in of scale", () => {
    // Place a text node with scale in a layer, verify setAbsolutePosition works
    const stage = new Konva.Stage({ container: document.createElement("div"), width: 800, height: 600 });
    const layer = new Konva.Layer();
    stage.add(layer);

    const node = new Konva.Text({
      id: "abs-pos-test",
      x: 100,
      y: 120,
      width: 200,
      height: 60,
      text: "hello",
      fontSize: 16,
      fontFamily: "Arial",
    });
    layer.add(node);

    const absBefore = node.absolutePosition();

    // Simulate transformer scaling the node
    node.scaleX(1.5);
    node.scaleY(1.2);
    // Absolute position of origin doesn't change just from scaling
    const absAfterScale = node.absolutePosition();
    expect(absAfterScale.x).toBeCloseTo(absBefore.x, 5);
    expect(absAfterScale.y).toBeCloseTo(absBefore.y, 5);

    // Bake and apply
    const el = TextPlugin.toTElement(node);
    TextPlugin.updateTextFromElement(node, el);

    const absAfterBake = node.absolutePosition();
    expect(absAfterBake.x).toBeCloseTo(absBefore.x, 3);
    expect(absAfterBake.y).toBeCloseTo(absBefore.y, 3);
    expect(node.scaleX()).toBeCloseTo(1, 5);
    expect(node.scaleY()).toBeCloseTo(1, 5);

    stage.destroy();
  });

  test("resize undo restores original dimensions and position", async () => {
    const { harness, ctx, node } = await createResizeHarness();

    const originalAbsPos = { ...node.absolutePosition() };
    const originalW = node.width();
    const originalH = node.height();

    await exportStageSnapshot({
      stage: harness.stage,
      label: "resize undo – before resize",
      relativeFilePath: `${snapshotDir}/01-before-resize.png`,
      waitMs: 60,
    });

    // Snap transformer to this node so transformstart/end work
    ctx.setState("selection", [node]);
    await flushCanvasEffects();

    // Simulate resize: scale the node as the transformer would
    const transformer = harness.dynamicLayer.findOne<Konva.Transformer>("Transformer")!;
    if (transformer) {
      simulateTransformerResize(transformer, node, { scaleX: 1.5, scaleY: 1.5 });
    } else {
      // Fallback: manually scale + call toTElement/updateTextFromElement
      node.scaleX(1.5);
      node.scaleY(1.5);
      const el = TextPlugin.toTElement(node);
      TextPlugin.updateTextFromElement(node, el);
      ctx.crdt.patch({ elements: [el], groups: [] });
      ctx.history.record({
        label: "resize-test",
        undo() { TextPlugin.updateTextFromElement(node, { ...el, data: { ...el.data, w: originalW, h: originalH } as any }); },
        redo() { TextPlugin.updateTextFromElement(node, el); },
      });
    }

    await flushCanvasEffects();

    await exportStageSnapshot({
      stage: harness.stage,
      label: "resize undo – after resize",
      relativeFilePath: `${snapshotDir}/02-after-resize.png`,
      waitMs: 60,
    });

    // Width should have grown
    expect(node.width()).toBeGreaterThan(originalW);

    // Position should be preserved (origin didn't move)
    const afterResizePos = node.absolutePosition();
    expect(afterResizePos.x).toBeCloseTo(originalAbsPos.x, 1);
    expect(afterResizePos.y).toBeCloseTo(originalAbsPos.y, 1);

    // Undo
    ctx.history.undo();
    await flushCanvasEffects();

    await exportStageSnapshot({
      stage: harness.stage,
      label: "resize undo – after undo",
      relativeFilePath: `${snapshotDir}/03-after-undo.png`,
      waitMs: 60,
    });

    // Dimensions should be restored
    expect(node.width()).toBeCloseTo(originalW, 1);
    expect(node.height()).toBeCloseTo(originalH, 1);

    harness.destroy();
  });
});

// ---------------------------------------------------------------------------
// Tests: Drag undo/redo
// ---------------------------------------------------------------------------

describe("TextPlugin – drag undo", () => {
  const snapshotDir = "tests/artifacts/text-plugin/drag";

  test("drag a text node then undo restores original position", async () => {
    let ctx!: IPluginContext;
    const docHandle = createMockDocHandle() as DocHandle<TCanvasDoc>;

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new TextPlugin()],
      initializeScene: (context) => {
        ctx = context;
        const textNode = new Konva.Text({
          id: "drag-text-1",
          x: 50,
          y: 60,
          width: 200,
          height: 30,
          text: "drag me",
          fontSize: 16,
          fontFamily: "Arial",
        });
        textNode.draggable(true);
        TextPlugin.setupShapeListeners(context, textNode);
        context.staticForegroundLayer.add(textNode);
      },
    });

    const node = harness.staticForegroundLayer.findOne<Konva.Text>("#drag-text-1")!;
    expect(node).toBeInstanceOf(Konva.Text);

    const startPos = { ...node.absolutePosition() };

    await exportStageSnapshot({
      stage: harness.stage,
      label: "drag – before drag",
      relativeFilePath: `${snapshotDir}/01-before-drag.png`,
      waitMs: 60,
    });

    dragShape(node, { deltaX: 100, deltaY: 50 });

    await exportStageSnapshot({
      stage: harness.stage,
      label: "drag – after drag",
      relativeFilePath: `${snapshotDir}/02-after-drag.png`,
      waitMs: 60,
    });

    const afterPos = node.absolutePosition();
    expect(afterPos.x).toBeCloseTo(startPos.x + 100, 1);
    expect(afterPos.y).toBeCloseTo(startPos.y + 50, 1);
    expect(ctx.history.canUndo()).toBe(true);

    ctx.history.undo();
    await flushCanvasEffects();

    await exportStageSnapshot({
      stage: harness.stage,
      label: "drag – after undo",
      relativeFilePath: `${snapshotDir}/03-after-undo.png`,
      waitMs: 60,
    });

    expect(node.absolutePosition().x).toBeCloseTo(startPos.x, 1);
    expect(node.absolutePosition().y).toBeCloseTo(startPos.y, 1);

    ctx.history.redo();
    await flushCanvasEffects();

    await exportStageSnapshot({
      stage: harness.stage,
      label: "drag – after redo",
      relativeFilePath: `${snapshotDir}/04-after-redo.png`,
      waitMs: 60,
    });

    expect(node.absolutePosition().x).toBeCloseTo(startPos.x + 100, 1);
    expect(node.absolutePosition().y).toBeCloseTo(startPos.y + 50, 1);

    harness.destroy();
  });
});

// ---------------------------------------------------------------------------
// Tests: CRDT persistence
// ---------------------------------------------------------------------------

describe("TextPlugin – CRDT persistence", () => {
  test("entering edit mode and committing text patches CRDT with correct TTextData", async () => {
    let ctx!: IPluginContext;
    const docHandle = createMockDocHandle() as DocHandle<TCanvasDoc>;

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new TextPlugin()],
      initializeScene: (context) => {
        ctx = context;
        const textNode = new Konva.Text({
          id: "crdt-text-1",
          x: 100,
          y: 100,
          width: 200,
          height: 30,
          text: "",
          fontSize: 16,
          fontFamily: "Arial",
        });
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

    const doc = docHandle.doc();
    const element = doc.elements["crdt-text-1"];
    expect(element).toBeTruthy();
    const data = element.data as import("@vibecanvas/shell/automerge/index").TTextData;
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
        const textNode = new Konva.Text({
          id: "crdt-nl-1",
          x: 100,
          y: 100,
          width: 200,
          height: 30,
          text: "",
          fontSize: 16,
          fontFamily: "Arial",
        });
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

    const doc = docHandle.doc();
    const data = doc.elements["crdt-nl-1"].data as import("@vibecanvas/shell/automerge/index").TTextData;
    expect(data.text).toBe("first line\nsecond line\nthird line");
    expect(data.text.split("\n")).toHaveLength(3);

    harness.destroy();
  });

  test("Escape commits text on a new node instead of discarding the edit", async () => {
    let ctx!: IPluginContext;

    const harness = await createCanvasTestHarness({
      plugins: [new TextPlugin()],
      initializeScene: (context) => {
        ctx = context;
        const textNode = new Konva.Text({
          id: "escape-text-1",
          x: 100,
          y: 100,
          width: 200,
          height: 30,
          text: "",
          fontSize: 16,
          fontFamily: "Arial",
        });
        TextPlugin.setupShapeListeners(context, textNode);
        context.staticForegroundLayer.add(textNode);
      },
    });

    const nodeBefore = harness.staticForegroundLayer.findOne<Konva.Text>("#escape-text-1");
    expect(nodeBefore).toBeInstanceOf(Konva.Text);

    TextPlugin.enterEditMode(ctx, nodeBefore!, true);
    const textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "committed by escape";

    textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await flushCanvasEffects();

    const nodeAfter = harness.staticForegroundLayer.findOne<Konva.Text>("#escape-text-1")!;
    expect(nodeAfter).toBeInstanceOf(Konva.Text);
    expect(nodeAfter.text()).toBe("committed by escape");
    expect(ctx.stage.container().querySelector("textarea")).toBeNull();

    harness.destroy();
  });
});

// ---------------------------------------------------------------------------
// Tests: Hydration capability
// ---------------------------------------------------------------------------

describe("TextPlugin – hydration capability", () => {
  test("createShapeFromTElement with type 'text' creates a Konva.Text", async () => {
    let ctx!: IPluginContext;

    const harness = await createCanvasTestHarness({
      plugins: [new TextPlugin()],
      initializeScene: (context) => {
        ctx = context;
      },
    });

    const element: TElement = {
      id: "text-hydrate-1",
      x: 50,
      y: 80,
      angle: 0,
      bindings: [],
      locked: false,
      parentGroupId: null,
      zIndex: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      style: {},
      data: {
        type: "text",
        w: 200,
        h: 40,
        text: "Hello world",
        originalText: "Hello world",
        fontSize: 16,
        fontFamily: "Arial",
        textAlign: "left",
        verticalAlign: "top",
        lineHeight: 1.2,
        link: null,
        containerId: null,
        autoResize: false,
      },
    };

    const node = ctx.capabilities.createShapeFromTElement?.(element);
    expect(node).toBeInstanceOf(Konva.Text);
    const textNode = node as Konva.Text;
    expect(textNode.id()).toBe("text-hydrate-1");
    expect(textNode.text()).toBe("Hello world");
    expect(textNode.fontSize()).toBe(16);
    expect(textNode.width()).toBe(200);

    harness.destroy();
  });

  test("hydrated text with newlines preserves newlines in Konva.Text", async () => {
    let ctx!: IPluginContext;

    const harness = await createCanvasTestHarness({
      plugins: [new TextPlugin()],
      initializeScene: (context) => {
        ctx = context;
      },
    });

    const element: TElement = {
      id: "text-hydrate-nl",
      x: 50,
      y: 80,
      angle: 0,
      bindings: [],
      locked: false,
      parentGroupId: null,
      zIndex: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      style: {},
      data: {
        type: "text",
        w: 200,
        h: 80,
        text: "line one\nline two\nline three",
        originalText: "line one\nline two\nline three",
        fontSize: 16,
        fontFamily: "Arial",
        textAlign: "left",
        verticalAlign: "top",
        lineHeight: 1.2,
        link: null,
        containerId: null,
        autoResize: false,
      },
    };

    const node = ctx.capabilities.createShapeFromTElement?.(element) as Konva.Text;
    expect(node.text()).toBe("line one\nline two\nline three");
    expect(node.text()).toContain("\n");

    harness.destroy();
  });
});

// ---------------------------------------------------------------------------
// Tests: toTElement serialization
// ---------------------------------------------------------------------------

describe("TextPlugin – toTElement", () => {
  test("serializes a Konva.Text node to TElement correctly", () => {
    const node = new Konva.Text({
      id: "t1",
      x: 10,
      y: 20,
      width: 150,
      height: 30,
      text: "hi",
      fontSize: 18,
      fontFamily: "Arial",
      align: "left",
      verticalAlign: "top",
      lineHeight: 1.2,
    });

    const el = TextPlugin.toTElement(node);
    expect(el.id).toBe("t1");
    expect(el.data.type).toBe("text");
    const data = el.data as import("@vibecanvas/shell/automerge/index").TTextData;
    expect(data.text).toBe("hi");
    expect(data.fontSize).toBe(18);
    expect(data.textAlign).toBe("left");
  });

  test("serializes multiline text with newlines intact", () => {
    const node = new Konva.Text({
      id: "t2",
      x: 0,
      y: 0,
      width: 200,
      height: 80,
      text: "line1\nline2\nline3",
      fontSize: 16,
      fontFamily: "Arial",
    });

    const el = TextPlugin.toTElement(node);
    const data = el.data as import("@vibecanvas/shell/automerge/index").TTextData;
    expect(data.text).toBe("line1\nline2\nline3");
    expect(data.text.split("\n")).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Tests: Group integration
// ---------------------------------------------------------------------------

describe("TextPlugin – group integration", () => {
  test("text node inside a group preserves absolute position on group/ungroup", async () => {
    let ctx!: IPluginContext;
    const docHandle = createMockDocHandle() as DocHandle<TCanvasDoc>;

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new TextPlugin(), new GroupPlugin()],
      initializeScene: (context) => {
        ctx = context;

        const textNode = new Konva.Text({
          id: "group-text-1",
          x: 80,
          y: 90,
          width: 200,
          height: 30,
          text: "grouped text",
          fontSize: 16,
          fontFamily: "Arial",
        });
        textNode.draggable(true);
        TextPlugin.setupShapeListeners(context, textNode);
        context.staticForegroundLayer.add(textNode);

        const rect = new Konva.Rect({
          id: "group-rect-1",
          x: 200,
          y: 90,
          width: 100,
          height: 50,
        });
        context.staticForegroundLayer.add(rect);
      },
    });

    const textNode = harness.staticForegroundLayer.findOne<Konva.Text>("#group-text-1")!;
    const rect = harness.staticForegroundLayer.findOne<Konva.Rect>("#group-rect-1")!;

    const textAbsBefore = { ...textNode.getAbsolutePosition() };

    const group = GroupPlugin.group(ctx, [textNode, rect]);
    expect(textNode.getParent()).toBe(group);

    const textAbsAfterGroup = textNode.getAbsolutePosition();
    expect(textAbsAfterGroup.x).toBeCloseTo(textAbsBefore.x, 5);
    expect(textAbsAfterGroup.y).toBeCloseTo(textAbsBefore.y, 5);

    GroupPlugin.ungroup(ctx, group);
    expect(textNode.getParent()).toBe(harness.staticForegroundLayer);

    const textAbsAfterUngroup = textNode.getAbsolutePosition();
    expect(textAbsAfterUngroup.x).toBeCloseTo(textAbsBefore.x, 5);
    expect(textAbsAfterUngroup.y).toBeCloseTo(textAbsBefore.y, 5);

    harness.destroy();
  });
});

// ---------------------------------------------------------------------------
// Tests: Group drilling — g(t, r)
// Double-click on text inside a group must first drill (g → t) before editing.
// ---------------------------------------------------------------------------

describe("TextPlugin – group drilling g(t, r)", () => {
  const snapshotDir = "tests/artifacts/text-plugin/group-drill";

  async function createGroupDrillHarness() {
    let ctx!: IPluginContext;
    const { plugins, groupPlugin } = createFullPluginStack();

    const harness = await createCanvasTestHarness({
      plugins,
      initializeScene: (context) => {
        ctx = context;
        initializeScene05GroupWithTextAndRect({ context, groupPlugin });
      },
    });

    const group = harness.staticForegroundLayer.getChildren().find(
      (n): n is Konva.Group => n instanceof Konva.Group,
    )!;
    const text = group.findOne<Konva.Text>("#t1")!;
    const rect = group.findOne<Konva.Rect>("#r1")!;

    expect(group).toBeInstanceOf(Konva.Group);
    expect(text).toBeInstanceOf(Konva.Text);
    expect(rect).toBeInstanceOf(Konva.Rect);

    return { harness, ctx, group, text, rect };
  }

  async function createTopLevelTextHarness() {
    let ctx!: IPluginContext;

    const harness = await createCanvasTestHarness({
      plugins: [new TextPlugin()],
      initializeScene: (context) => {
        ctx = context;
        const textNode = new Konva.Text({
          id: "plain-text-1",
          x: 120,
          y: 140,
          width: 150,
          height: 30,
          text: "plain text",
          fontSize: 16,
          fontFamily: "Arial",
          wrap: "none",
        });
        TextPlugin.setupShapeListeners(context, textNode);
        textNode.draggable(true);
        context.staticForegroundLayer.add(textNode);
      },
    });

    const text = harness.staticForegroundLayer.findOne<Konva.Text>("#plain-text-1")!;
    return { harness, ctx, text };
  }

  function firePointerDown(node: Konva.Node) {
    node.fire(
      "pointerdown",
      { evt: new PointerEvent("pointerdown", { bubbles: true }) },
      true,
    );
  }

  function fireDblClick(node: Konva.Node) {
    node.fire(
      "pointerdblclick",
      { evt: new PointerEvent("dblclick", { bubbles: true }) },
      true,
    );
  }

  test("pointerdown on text inside group selects the group, not the text", async () => {
    const { harness, ctx, group, text } = await createGroupDrillHarness();

    firePointerDown(text);
    await flushCanvasEffects();

    expect(ctx.state.selection.map((n) => n.id())).toEqual([group.id()]);

    harness.destroy();
  });

  test("dblclick on text while group is focused drills to text — no edit mode", async () => {
    const { harness, ctx, group, text } = await createGroupDrillHarness();

    // Step 1: select the group
    firePointerDown(text);
    await flushCanvasEffects();
    expect(ctx.state.selection.map((n) => n.id())).toEqual([group.id()]);

    await exportStageSnapshot({
      stage: harness.stage,
      label: "group-drill – group selected",
      relativeFilePath: `${snapshotDir}/01-group-selected.png`,
      waitMs: 60,
    });

    // Step 2: dblclick on text — should drill to text, NOT open edit mode
    fireDblClick(text);
    await flushCanvasEffects();

    await exportStageSnapshot({
      stage: harness.stage,
      label: "group-drill – after first dblclick (text focused)",
      relativeFilePath: `${snapshotDir}/02-text-focused.png`,
      waitMs: 60,
    });

    // Text node is now selected (drilled)
    expect(ctx.state.selection.map((n) => n.id())).toContain(text.id());

    // No textarea — edit mode must NOT have opened
    const textarea = ctx.stage.container().querySelector("textarea");
    expect(textarea).toBeNull();

    harness.destroy();
  });

  test("second dblclick on already-focused text enters edit mode", async () => {
    const { harness, ctx, group, text } = await createGroupDrillHarness();

    // Step 1: select group
    firePointerDown(text);
    await flushCanvasEffects();

    // Step 2: drill to text
    fireDblClick(text);
    await flushCanvasEffects();
    expect(ctx.state.selection.map((n) => n.id())).toContain(text.id());
    expect(ctx.stage.container().querySelector("textarea")).toBeNull();

    await exportStageSnapshot({
      stage: harness.stage,
      label: "group-drill – text focused, before edit",
      relativeFilePath: `${snapshotDir}/03-before-edit.png`,
      waitMs: 60,
    });

    // Step 3: dblclick again — now should open edit mode
    fireDblClick(text);
    await flushCanvasEffects();

    await exportStageSnapshot({
      stage: harness.stage,
      label: "group-drill – edit mode open",
      relativeFilePath: `${snapshotDir}/04-edit-mode.png`,
      waitMs: 60,
    });

    const textarea = ctx.stage.container().querySelector("textarea");
    expect(textarea).not.toBeNull();

    // Clean up
    textarea!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    harness.destroy();
  });

  test("transformer is hidden during text edit and restored after Escape commit", async () => {
    const { harness, ctx, text } = await createGroupDrillHarness();

    firePointerDown(text);
    await flushCanvasEffects();
    fireDblClick(text);
    await flushCanvasEffects();
    fireDblClick(text);
    await flushCanvasEffects();

    const transformer = harness.dynamicLayer.findOne<Konva.Transformer>("Transformer")!;
    const textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;

    expect(transformer).toBeTruthy();
    expect(textarea).not.toBeNull();
    expect(ctx.state.editingTextId).toBe(text.id());
    expect(transformer.nodes()).toHaveLength(0);

    textarea.value = "edited and committed via escape";
    textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await flushCanvasEffects();

    expect(ctx.state.editingTextId).toBeNull();
    expect(ctx.stage.container().querySelector("textarea")).toBeNull();
    expect(text.text()).toBe("edited and committed via escape");
    expect(transformer.nodes().map((node) => node.id())).toEqual([text.id()]);

    harness.destroy();
  });

  test("Enter and Shift+Enter behave the same in text edit: both insert newlines and keep editing open", async () => {
    const { harness, ctx, text } = await createGroupDrillHarness();

    firePointerDown(text);
    await flushCanvasEffects();
    fireDblClick(text);
    await flushCanvasEffects();
    fireDblClick(text);
    await flushCanvasEffects();

    const textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();

    textarea.value = "alpha";
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    const enterEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    const enterNotCanceled = textarea.dispatchEvent(enterEvent);
    await flushCanvasEffects();

    expect(enterNotCanceled).toBe(false);
    expect(enterEvent.defaultPrevented).toBe(true);
    expect(ctx.stage.container().querySelector("textarea")).not.toBeNull();
    expect(textarea.value).toBe("alpha\n");

    const shiftEnterEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    const shiftEnterNotCanceled = textarea.dispatchEvent(shiftEnterEvent);
    await flushCanvasEffects();

    expect(shiftEnterNotCanceled).toBe(false);
    expect(shiftEnterEvent.defaultPrevented).toBe(true);
    expect(ctx.stage.container().querySelector("textarea")).not.toBeNull();
    expect(textarea.value).toBe("alpha\n\n");

    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    expect(text.text()).toBe("alpha\n\n");

    harness.destroy();
  });

  test("typing toolbar shortcut keys inside text edit mode does not trigger tool changes", async () => {
    const { harness, ctx, text } = await createGroupDrillHarness();

    firePointerDown(text);
    await flushCanvasEffects();
    fireDblClick(text);
    await flushCanvasEffects();
    fireDblClick(text);
    await flushCanvasEffects();

    const textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();
    expect(ctx.state.selection.map((node) => node.id())).toContain(text.id());
    expect(ctx.state.mode).toBe(CanvasMode.SELECT);

    const rectangleShortcutEvent = new KeyboardEvent("keydown", {
      key: "r",
      bubbles: true,
      cancelable: true,
    });

    const rectangleShortcutNotIntercepted = textarea.dispatchEvent(rectangleShortcutEvent);
    await flushCanvasEffects();

    expect(rectangleShortcutNotIntercepted).toBe(true);
    expect(rectangleShortcutEvent.defaultPrevented).toBe(false);
    expect(ctx.state.mode).toBe(CanvasMode.SELECT);

    const spaceKeydownEvent = new KeyboardEvent("keydown", {
      key: " ",
      bubbles: true,
      cancelable: true,
    });
    const spaceKeyupEvent = new KeyboardEvent("keyup", {
      key: " ",
      bubbles: true,
      cancelable: true,
    });

    const spaceKeydownNotIntercepted = textarea.dispatchEvent(spaceKeydownEvent);
    const spaceKeyupNotIntercepted = textarea.dispatchEvent(spaceKeyupEvent);
    await flushCanvasEffects();

    expect(spaceKeydownNotIntercepted).toBe(true);
    expect(spaceKeyupNotIntercepted).toBe(true);
    expect(spaceKeydownEvent.defaultPrevented).toBe(false);
    expect(spaceKeyupEvent.defaultPrevented).toBe(false);
    expect(ctx.state.mode).toBe(CanvasMode.SELECT);

    textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    harness.destroy();
  });

  test("word-wrapped text height is captured from textarea, not just newline count", async () => {
    const { harness, ctx, group, text } = await createGroupDrillHarness();

    // Drill into the text node first
    firePointerDown(text);
    await flushCanvasEffects();
    fireDblClick(text);
    await flushCanvasEffects();
    fireDblClick(text);
    await flushCanvasEffects();

    const textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();

    // Simulate a long word-wrapped line with no explicit newlines.
    // In JSDOM scrollHeight is 0, so autoGrow falls back to scaledHeight.
    // The height stored on the node after commit must be >= what computeTextHeight
    // would give for a single line (the floor), and >= the original node height.
    const nodeHeightBefore = text.height();
    textarea.value = "a".repeat(200); // long single line, no \n
    textarea.dispatchEvent(new Event("input"));
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    await exportStageSnapshot({
      stage: harness.stage,
      label: "group-drill – word-wrap height test",
      relativeFilePath: `${snapshotDir}/05-word-wrap-height.png`,
      waitMs: 60,
    });

    // After commit the node height must be at least the single-line minimum
    const minExpected = TextPlugin.computeTextHeight(text, "a".repeat(200));
    expect(text.height()).toBeGreaterThanOrEqual(minExpected);

    // With explicit newlines, height must grow proportionally
    fireDblClick(text);
    await flushCanvasEffects();
    const textarea2 = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    const origHeight = text.height();
    textarea2.value = "line1\nline2\nline3";
    textarea2.dispatchEvent(new Event("input"));
    textarea2.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    expect(text.height()).toBeGreaterThan(origHeight);
    expect(text.text()).toBe("line1\nline2\nline3");

    harness.destroy();
  });

  test("deleting the last newline shrinks text height on the next commit", async () => {
    const { harness, ctx, text } = await createGroupDrillHarness();

    firePointerDown(text);
    await flushCanvasEffects();
    fireDblClick(text);
    await flushCanvasEffects();
    fireDblClick(text);
    await flushCanvasEffects();

    const textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "line1\nline2\nline3";
    textarea.dispatchEvent(new Event("input"));
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    const tallHeight = text.height();
    expect(text.text()).toBe("line1\nline2\nline3");

    fireDblClick(text);
    await flushCanvasEffects();

    const textarea2 = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    textarea2.value = "line1\nline2";
    textarea2.dispatchEvent(new Event("input"));
    textarea2.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    const shorterHeight = text.height();
    expect(text.text()).toBe("line1\nline2");
    expect(shorterHeight).toBeLessThan(tallHeight);

    harness.destroy();
  });

  test("long single-line text expands edit width and committed render width instead of forced wrapping", async () => {
    const { harness, ctx, text } = await createGroupDrillHarness();

    firePointerDown(text);
    await flushCanvasEffects();
    fireDblClick(text);
    await flushCanvasEffects();
    fireDblClick(text);
    await flushCanvasEffects();

    const textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    const initialTextareaWidth = parseFloat(textarea.style.width);
    const initialNodeWidth = text.width();
    const singleLineHeight = TextPlugin.computeTextHeight(text, "this is all a single line of text but we get a forced new line in edit mode");

    Object.defineProperty(textarea, "scrollWidth", {
      configurable: true,
      get: () => 420,
    });
    Object.defineProperty(textarea, "scrollHeight", {
      configurable: true,
      get: () => 20,
    });

    textarea.value = "this is all a single line of text but we get a forced new line in edit mode";
    textarea.dispatchEvent(new Event("input"));

    expect(parseFloat(textarea.style.width)).toBeGreaterThan(initialTextareaWidth);

    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    expect(text.width()).toBeGreaterThan(initialNodeWidth);
    expect(text.height()).toBeCloseTo(singleLineHeight, 0);
    expect(text.text()).toBe("this is all a single line of text but we get a forced new line in edit mode");

    harness.destroy();
  });

  test("alt-drag on plain text creates a copied text node", async () => {
    const { harness, ctx, text } = await createTopLevelTextHarness();

    ctx.setState("selection", [text]);
    await flushCanvasEffects();

    expect(harness.staticForegroundLayer.find("Text")).toHaveLength(1);
    const originalPosition = { ...text.absolutePosition() };

    altDragNode(text, { deltaX: 80, deltaY: 20 });
    await flushCanvasEffects();

    const texts = harness.staticForegroundLayer.find("Text") as Konva.Text[];
    expect(texts).toHaveLength(2);

    const clonedText = texts.find((node) => node.id() !== text.id());
    expect(clonedText).toBeTruthy();
    expect(clonedText!.text()).toBe(text.text());
    expect(text.absolutePosition()).toEqual(originalPosition);
    expect(clonedText!.absolutePosition().x).toBeCloseTo(text.absolutePosition().x + 80, 0);
    expect(clonedText!.absolutePosition().y).toBeCloseTo(text.absolutePosition().y + 20, 0);

    harness.destroy();
  });

  test("alt-dragging a cloned plain text adds exactly one more text node", async () => {
    const { harness, ctx, text } = await createTopLevelTextHarness();

    ctx.setState("selection", [text]);
    await flushCanvasEffects();

    altDragNode(text, { deltaX: 80, deltaY: 20 });
    await flushCanvasEffects();

    const firstClone = (harness.staticForegroundLayer.find("Text") as Konva.Text[])
      .find((node) => node.id() !== text.id())!;

    ctx.setState("selection", [firstClone]);
    await flushCanvasEffects();

    altDragNode(firstClone, { deltaX: 60, deltaY: 10 });
    await flushCanvasEffects();

    const texts = harness.staticForegroundLayer.find("Text") as Konva.Text[];
    expect(texts).toHaveLength(3);
    expect(new Set(texts.map((node) => node.id())).size).toBe(3);

    harness.destroy();
  });
});
