import Konva from "konva";
import type { DocHandle } from "@automerge/automerge-repo";
import type { TCanvasDoc } from "@vibecanvas/automerge-service/types/canvas-doc";
import { describe, expect, test } from "vitest";
import { TextPlugin, type IPluginContext } from "../../../src/plugins";
import { CanvasMode } from "../../../src/services/canvas/enum";
import { initializeScene05GroupWithTextAndRect } from "../../scenarios/05-group-with-text-and-rect";
import {
  createCanvasTestHarness,
  createMockDocHandle,
  exportStageSnapshot,
  flushCanvasEffects,
} from "../../test-setup";
import { altDragNode, createFullPluginStack } from "./helpers";

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
        const textNode = new Konva.Text({ id: "nl-text-1", x: 100, y: 100, width: 200, height: 30, text: "", fontSize: 16, fontFamily: "Arial", wrap: "word" });
        TextPlugin.setupShapeListeners(context, textNode);
        context.staticForegroundLayer.add(textNode);
      },
    });

    const node = harness.staticForegroundLayer.findOne<Konva.Text>("#nl-text-1")!;
    await exportStageSnapshot({ stage: harness.stage, label: "newline test – before edit", relativeFilePath: `${snapshotDir}/01-before-edit.png`, waitMs: 60 });
    TextPlugin.enterEditMode(ctx, node, false);
    const textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea.style.whiteSpace).toBe("pre");
    textarea.value = "Hello\nWorld\n  indented";
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();
    await exportStageSnapshot({ stage: harness.stage, label: "newline test – after commit multiline", relativeFilePath: `${snapshotDir}/02-after-commit.png`, waitMs: 60 });
    expect(node.text()).toBe("Hello\nWorld\n  indented");
    const data = docHandle.doc().elements["nl-text-1"].data as import("@vibecanvas/automerge-service/types/canvas-doc").TTextData;
    expect(data.text).toBe("Hello\nWorld\n  indented");
    harness.destroy();
  });

  test("textarea is auto-sized on open to show all existing lines without scrolling", async () => {
    let ctx!: IPluginContext;
    const harness = await createCanvasTestHarness({
      plugins: [new TextPlugin()],
      initializeScene: (context) => {
        ctx = context;
        const textNode = new Konva.Text({ id: "autogrow-open-1", x: 100, y: 100, width: 200, height: 80, text: "first line\nsecond line\nthird line", fontSize: 16, fontFamily: "Arial", wrap: "word" });
        TextPlugin.setupShapeListeners(context, textNode);
        context.staticForegroundLayer.add(textNode);
      },
    });
    const node = harness.staticForegroundLayer.findOne<Konva.Text>("#autogrow-open-1")!;
    TextPlugin.enterEditMode(ctx, node, false);
    const textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    expect(parseFloat(textarea.style.height)).toBeGreaterThan(0);
    expect(textarea.value).toBe("first line\nsecond line\nthird line");
    textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await flushCanvasEffects();
    expect(ctx.stage.container().querySelector("textarea")).toBeNull();
    harness.destroy();
  });

  test("leading and trailing whitespace is preserved (no implicit trim)", async () => {
    let ctx!: IPluginContext;
    const harness = await createCanvasTestHarness({
      plugins: [new TextPlugin()],
      initializeScene: (context) => {
        ctx = context;
        const textNode = new Konva.Text({ id: "ws-text-1", x: 100, y: 200, width: 200, height: 30, text: "", fontSize: 16, fontFamily: "Arial" });
        TextPlugin.setupShapeListeners(context, textNode);
        context.staticForegroundLayer.add(textNode);
      },
    });
    const node = harness.staticForegroundLayer.findOne<Konva.Text>("#ws-text-1")!;
    TextPlugin.enterEditMode(ctx, node, false);
    const textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "  spaces  ";
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();
    expect(node.text()).toBe("  spaces  ");
    harness.destroy();
  });

  test("undo after multiline edit restores original text", async () => {
    let ctx!: IPluginContext;
    const harness = await createCanvasTestHarness({
      plugins: [new TextPlugin()],
      initializeScene: (context) => {
        ctx = context;
        const textNode = new Konva.Text({ id: "undo-nl-text-1", x: 100, y: 300, width: 200, height: 50, text: "original", fontSize: 16, fontFamily: "Arial" });
        TextPlugin.setupShapeListeners(context, textNode);
        context.staticForegroundLayer.add(textNode);
      },
    });
    const node = harness.staticForegroundLayer.findOne<Konva.Text>("#undo-nl-text-1")!;
    TextPlugin.enterEditMode(ctx, node, false);
    const textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "line1\nline2\nline3";
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();
    ctx.history.undo();
    await flushCanvasEffects();
    expect(node.text()).toBe("original");
    ctx.history.redo();
    await flushCanvasEffects();
    expect(node.text()).toBe("line1\nline2\nline3");
    harness.destroy();
  });
});

describe("TextPlugin – group drilling g(t, r)", () => {
  async function createGroupDrillHarness() {
    let ctx!: IPluginContext;
    const { plugins, groupPlugin } = createFullPluginStack();
    const harness = await createCanvasTestHarness({ plugins, initializeScene: (context) => { ctx = context; initializeScene05GroupWithTextAndRect({ context, groupPlugin }); } });
    const group = harness.staticForegroundLayer.getChildren().find((n): n is Konva.Group => n instanceof Konva.Group)!;
    const text = group.findOne<Konva.Text>("#t1")!;
    const rect = group.findOne<Konva.Rect>("#r1")!;
    return { harness, ctx, group, text, rect };
  }

  async function createTopLevelTextHarness() {
    let ctx!: IPluginContext;
    const harness = await createCanvasTestHarness({
      plugins: [new TextPlugin()],
      initializeScene: (context) => {
        ctx = context;
        const textNode = new Konva.Text({ id: "plain-text-1", x: 120, y: 140, width: 150, height: 30, text: "plain text", fontSize: 16, fontFamily: "Arial", wrap: "none" });
        TextPlugin.setupShapeListeners(context, textNode);
        textNode.draggable(true);
        context.staticForegroundLayer.add(textNode);
      },
    });
    const text = harness.staticForegroundLayer.findOne<Konva.Text>("#plain-text-1")!;
    return { harness, ctx, text };
  }

  async function createTopLevelMultiTextHarness() {
    let ctx!: IPluginContext;
    const harness = await createCanvasTestHarness({
      plugins: [new TextPlugin()],
      initializeScene: (context) => {
        ctx = context;

        const textA = new Konva.Text({ id: "plain-text-a", x: 120, y: 140, width: 150, height: 30, text: "plain text a", fontSize: 16, fontFamily: "Arial", wrap: "none" });
        const textB = new Konva.Text({ id: "plain-text-b", x: 340, y: 200, width: 150, height: 30, text: "plain text b", fontSize: 16, fontFamily: "Arial", wrap: "none" });

        [textA, textB].forEach((textNode) => {
          TextPlugin.setupShapeListeners(context, textNode);
          textNode.draggable(true);
          context.staticForegroundLayer.add(textNode);
        });
      },
    });
    const textA = harness.staticForegroundLayer.findOne<Konva.Text>("#plain-text-a")!;
    const textB = harness.staticForegroundLayer.findOne<Konva.Text>("#plain-text-b")!;
    return { harness, ctx, textA, textB };
  }

  function firePointerDown(node: Konva.Node) {
    node.fire("pointerdown", { evt: new PointerEvent("pointerdown", { bubbles: true }) }, true);
  }

  function fireDblClick(node: Konva.Node) {
    node.fire("pointerdblclick", { evt: new PointerEvent("dblclick", { bubbles: true }) }, true);
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
    firePointerDown(text);
    await flushCanvasEffects();
    expect(ctx.state.selection.map((n) => n.id())).toEqual([group.id()]);
    fireDblClick(text);
    await flushCanvasEffects();
    expect(ctx.state.selection.map((n) => n.id())).toContain(text.id());
    expect(ctx.stage.container().querySelector("textarea")).toBeNull();
    harness.destroy();
  });

  test("second dblclick on already-focused text enters edit mode", async () => {
    const { harness, ctx, text } = await createGroupDrillHarness();
    firePointerDown(text);
    await flushCanvasEffects();
    fireDblClick(text);
    await flushCanvasEffects();
    fireDblClick(text);
    await flushCanvasEffects();
    const textarea = ctx.stage.container().querySelector("textarea");
    expect(textarea).not.toBeNull();
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
    expect(ctx.state.editingTextId).toBe(text.id());
    expect(transformer.nodes()).toHaveLength(0);
    textarea.value = "edited and committed via escape";
    textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await flushCanvasEffects();
    expect(ctx.state.editingTextId).toBeNull();
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
    textarea.value = "alpha";
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    const enterEvent = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    const enterNotCanceled = textarea.dispatchEvent(enterEvent);
    await flushCanvasEffects();
    expect(enterNotCanceled).toBe(false);
    expect(enterEvent.defaultPrevented).toBe(true);
    expect(textarea.value).toBe("alpha\n");
    const shiftEnterEvent = new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true, cancelable: true });
    const shiftEnterNotCanceled = textarea.dispatchEvent(shiftEnterEvent);
    await flushCanvasEffects();
    expect(shiftEnterNotCanceled).toBe(false);
    expect(shiftEnterEvent.defaultPrevented).toBe(true);
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
    expect(ctx.state.selection.map((node) => node.id())).toContain(text.id());
    expect(ctx.state.mode).toBe(CanvasMode.SELECT);
    const rectangleShortcutEvent = new KeyboardEvent("keydown", { key: "r", bubbles: true, cancelable: true });
    const rectangleShortcutNotIntercepted = textarea.dispatchEvent(rectangleShortcutEvent);
    await flushCanvasEffects();
    expect(rectangleShortcutNotIntercepted).toBe(true);
    expect(rectangleShortcutEvent.defaultPrevented).toBe(false);
    expect(ctx.state.mode).toBe(CanvasMode.SELECT);
    textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    harness.destroy();
  });

  test("word-wrapped text height is captured from textarea, not just newline count", async () => {
    const { harness, ctx, text } = await createGroupDrillHarness();
    firePointerDown(text);
    await flushCanvasEffects();
    fireDblClick(text);
    await flushCanvasEffects();
    fireDblClick(text);
    await flushCanvasEffects();
    const textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "a".repeat(200);
    textarea.dispatchEvent(new Event("input"));
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();
    const minExpected = TextPlugin.computeTextHeight(text, "a".repeat(200));
    expect(text.height()).toBeGreaterThanOrEqual(minExpected);
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
    fireDblClick(text);
    await flushCanvasEffects();
    const textarea2 = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    textarea2.value = "line1\nline2";
    textarea2.dispatchEvent(new Event("input"));
    textarea2.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();
    expect(text.height()).toBeLessThan(tallHeight);
    expect(text.text()).toBe("line1\nline2");
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
    Object.defineProperty(textarea, "scrollWidth", { configurable: true, get: () => 420 });
    Object.defineProperty(textarea, "scrollHeight", { configurable: true, get: () => 20 });
    textarea.value = "this is all a single line of text but we get a forced new line in edit mode";
    textarea.dispatchEvent(new Event("input"));
    expect(parseFloat(textarea.style.width)).toBeGreaterThan(initialTextareaWidth);
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();
    expect(text.width()).toBeGreaterThan(initialNodeWidth);
    expect(text.height()).toBeCloseTo(singleLineHeight, 0);
    harness.destroy();
  });

  test("alt-drag on plain text creates a copied text node", async () => {
    const { harness, ctx, text } = await createTopLevelTextHarness();
    ctx.setState("selection", [text]);
    await flushCanvasEffects();
    const originalPosition = { ...text.absolutePosition() };
    altDragNode(text, { deltaX: 80, deltaY: 20 });
    await flushCanvasEffects();
    const texts = harness.staticForegroundLayer.find("Text") as Konva.Text[];
    expect(texts).toHaveLength(2);
    const clonedText = texts.find((node) => node.id() !== text.id())!;
    expect(clonedText.text()).toBe(text.text());
    expect(text.absolutePosition()).toEqual(originalPosition);
    expect(clonedText.absolutePosition().x).toBeCloseTo(text.absolutePosition().x + 80, 0);
    expect(clonedText.absolutePosition().y).toBeCloseTo(text.absolutePosition().y + 20, 0);
    harness.destroy();
  });

  test("alt-dragging a cloned plain text adds exactly one more text node", async () => {
    const { harness, ctx, text } = await createTopLevelTextHarness();
    ctx.setState("selection", [text]);
    await flushCanvasEffects();
    altDragNode(text, { deltaX: 80, deltaY: 20 });
    await flushCanvasEffects();
    const firstClone = (harness.staticForegroundLayer.find("Text") as Konva.Text[]).find((node) => node.id() !== text.id())!;
    ctx.setState("selection", [firstClone]);
    await flushCanvasEffects();
    altDragNode(firstClone, { deltaX: 60, deltaY: 10 });
    await flushCanvasEffects();
    const texts = harness.staticForegroundLayer.find("Text") as Konva.Text[];
    expect(texts).toHaveLength(3);
    expect(new Set(texts.map((node) => node.id())).size).toBe(3);
    harness.destroy();
  });

  test("alt-dragging one text in a top-level multi-selection should clone both selected texts", async () => {
    const { harness, ctx, textA, textB } = await createTopLevelMultiTextHarness();
    ctx.setState("selection", [textA, textB]);
    await flushCanvasEffects();

    altDragNode(textB, { deltaX: 80, deltaY: 20 });
    await flushCanvasEffects();

    const texts = harness.staticForegroundLayer.find("Text") as Konva.Text[];
    expect(texts).toHaveLength(4);

    harness.destroy();
  });
});
