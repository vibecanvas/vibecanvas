import Konva from "konva";
import type { DocHandle } from "@automerge/automerge-repo";
import type { TCanvasDoc } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { describe, expect, test } from "vitest";
import { GroupPlugin, SelectPlugin, Shape2dPlugin, TextPlugin, TransformPlugin, type IPluginContext } from "../../../src/plugins";
import { createCanvasTestHarness, createMockDocHandle, flushCanvasEffects } from "../../test-setup";

function dispatchKeyboardEvent(target: EventTarget, type: "keydown" | "keyup", init: KeyboardEventInit) {
  const event = new KeyboardEvent(type, { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

function getNodeCenter(node: Konva.Node) {
  const box = node.getClientRect();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

function dragShapeInScreenSpace(shape: Konva.Shape, args: { deltaX: number; deltaY?: number }) {
  const beforeAbsolutePosition = shape.absolutePosition();
  shape.fire("dragstart", { target: shape, currentTarget: shape, evt: new MouseEvent("dragstart", { bubbles: true }) });
  shape.setAbsolutePosition({ x: beforeAbsolutePosition.x + args.deltaX, y: beforeAbsolutePosition.y + (args.deltaY ?? 0) });
  shape.fire("dragmove", { target: shape, currentTarget: shape, evt: new MouseEvent("dragmove", { bubbles: true }) });
  shape.fire("dragend", { target: shape, currentTarget: shape, evt: new MouseEvent("dragend", { bubbles: true }) });
}

function fireDblClick(node: Konva.Node) {
  node.fire("pointerdblclick", { evt: new PointerEvent("dblclick", { bubbles: true }) }, true);
}

function altDragRect(shape: Konva.Rect, args: { deltaX: number; deltaY?: number }) {
  const beforeNodeIds = new Set(
    shape.getStage()?.getLayers().flatMap((layer) => layer.getChildren()).map((child) => child._id) ?? [],
  );

  shape.fire("dragstart", {
    target: shape,
    currentTarget: shape,
    evt: new MouseEvent("dragstart", { bubbles: true, altKey: true }),
  });

  const previewClone = shape.getStage()?.getLayers()
    .flatMap((layer) => layer.getChildren())
    .find((child) => !beforeNodeIds.has(child._id) && child instanceof Konva.Rect) as Konva.Rect | undefined;

  if (!previewClone) throw new Error("Expected preview clone after alt-drag start");

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

async function createAttachedRectTextHarness() {
  let ctx!: IPluginContext;
  const docHandle = createMockDocHandle() as DocHandle<TCanvasDoc>;

  const harness = await createCanvasTestHarness({
    docHandle,
    plugins: [new SelectPlugin(), new TransformPlugin(), new Shape2dPlugin(), new TextPlugin(), new GroupPlugin()],
    initializeScene: (context) => {
      ctx = context;
      const rect = Shape2dPlugin.createRectFromElement({
        id: "attached-rect-1",
        x: 120,
        y: 100,
        rotation: 0,
        bindings: [],
        createdAt: Date.now(),
        locked: false,
        parentGroupId: null,
        updatedAt: Date.now(),
        zIndex: "",
        data: { type: "rect", w: 180, h: 100 },
        style: { backgroundColor: "red" },
      });

      Shape2dPlugin.setupShapeListeners(context, rect);
      rect.setDraggable(true);
      context.staticForegroundLayer.add(rect);
      context.crdt.patch({ elements: [Shape2dPlugin.toTElement(rect)], groups: [] });
    },
  });

  const rect = harness.staticForegroundLayer.findOne<Konva.Rect>("#attached-rect-1")!;
  return { harness, ctx, rect, docHandle };
}

async function createGroupedAttachedRectTextHarness() {
  let ctx!: IPluginContext;
  const docHandle = createMockDocHandle() as DocHandle<TCanvasDoc>;

  const harness = await createCanvasTestHarness({
    docHandle,
    plugins: [new SelectPlugin(), new TransformPlugin(), new Shape2dPlugin(), new TextPlugin(), new GroupPlugin()],
    initializeScene: (context) => {
      ctx = context;
      const rect = Shape2dPlugin.createRectFromElement({
        id: "grouped-attached-rect-1",
        x: 120,
        y: 100,
        rotation: 0,
        bindings: [],
        createdAt: Date.now(),
        locked: false,
        parentGroupId: null,
        updatedAt: Date.now(),
        zIndex: "",
        data: { type: "rect", w: 180, h: 100 },
        style: { backgroundColor: "red" },
      });

      Shape2dPlugin.setupShapeListeners(context, rect);
      rect.setDraggable(true);
      context.staticForegroundLayer.add(rect);
      const group = GroupPlugin.group(context, [rect]);
      context.crdt.patch({ elements: [Shape2dPlugin.toTElement(rect)], groups: [] });
      context.crdt.patch({ elements: [], groups: [GroupPlugin.toTGroup(group)] });
    },
  });

  const rect = harness.staticForegroundLayer.findOne<Konva.Rect>("#grouped-attached-rect-1")!;
  const group = rect.getParent() as Konva.Group;
  return { harness, ctx, rect, group, docHandle };
}

describe("Shape2dPlugin – attached text", () => {
  test("pressing Enter on a selected rect creates attached text and opens edit mode", async () => {
    const { harness, ctx, rect, docHandle } = await createAttachedRectTextHarness();

    ctx.setState("selection", [rect]);
    await flushCanvasEffects();
    ctx.hooks.keydown.call(dispatchKeyboardEvent(ctx.stage.container(), "keydown", { key: "Enter" }));
    await flushCanvasEffects();

    const attachedText = harness.staticForegroundLayer.findOne<Konva.Text>((node: Konva.Node) => node instanceof Konva.Text && TextPlugin.getContainerId(node) === rect.id())!;
    const textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;

    expect(TextPlugin.getContainerId(attachedText)).toBe(rect.id());
    expect(attachedText.draggable()).toBe(false);
    expect(attachedText.listening()).toBe(false);
    expect(attachedText.align()).toBe("center");
    expect(attachedText.verticalAlign()).toBe("middle");
    expect(ctx.state.editingTextId).toBe(attachedText.id());
    expect(textarea).not.toBeNull();

    textarea.value = "hello rect";
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    const textElement = docHandle.doc().elements[attachedText.id()];
    expect((textElement?.data as any).containerId).toBe(rect.id());
    expect((textElement?.data as any).text).toBe("hello rect");
    expect(attachedText.text()).toBe("hello rect");

    harness.destroy();
  });

  test("dblclick on selected rect creates attached text and opens edit mode", async () => {
    const { harness, ctx, rect, docHandle } = await createAttachedRectTextHarness();

    ctx.setState("selection", [rect]);
    await flushCanvasEffects();
    fireDblClick(rect);
    await flushCanvasEffects();

    const attachedText = harness.staticForegroundLayer.findOne<Konva.Text>((node: Konva.Node) => node instanceof Konva.Text && TextPlugin.getContainerId(node) === rect.id())!;
    const textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;

    expect(ctx.state.editingTextId).toBe(attachedText.id());
    expect(textarea).not.toBeNull();

    textarea.value = "hello dblclick";
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    const textElement = docHandle.doc().elements[attachedText.id()];
    expect((textElement?.data as any).containerId).toBe(rect.id());
    expect((textElement?.data as any).text).toBe("hello dblclick");

    harness.destroy();
  });

  test("dblclick on grouped rect drills first, edits on second dblclick", async () => {
    const { harness, ctx, rect, group } = await createGroupedAttachedRectTextHarness();

    ctx.setState("selection", [group]);
    await flushCanvasEffects();

    fireDblClick(rect);
    await flushCanvasEffects();
    expect(ctx.state.selection.map((node) => node.id())).toEqual([group.id(), rect.id()]);
    expect(ctx.stage.container().querySelector("textarea")).toBeNull();

    fireDblClick(rect);
    await flushCanvasEffects();
    const textarea = ctx.stage.container().querySelector("textarea");
    expect(textarea).not.toBeNull();

    harness.destroy();
  });

  test("dragging and rotating a rect keeps attached text centered", async () => {
    const { harness, ctx, rect, docHandle } = await createAttachedRectTextHarness();

    ctx.setState("selection", [rect]);
    await flushCanvasEffects();
    ctx.hooks.keydown.call(dispatchKeyboardEvent(ctx.stage.container(), "keydown", { key: "Enter" }));
    await flushCanvasEffects();

    const attachedText = harness.staticForegroundLayer.findOne<Konva.Text>((node: Konva.Node) => node instanceof Konva.Text && TextPlugin.getContainerId(node) === rect.id())!;
    const textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "drag me";
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    dragShapeInScreenSpace(rect, { deltaX: 48, deltaY: 32 });
    await flushCanvasEffects();
    rect.rotation(33);
    rect.fire("transform", { target: rect, currentTarget: rect, evt: {} as Event });
    await flushCanvasEffects();

    const rectCenter = getNodeCenter(rect);
    const textCenter = getNodeCenter(attachedText);
    expect(textCenter.x).toBeCloseTo(rectCenter.x, 1);
    expect(textCenter.y).toBeCloseTo(rectCenter.y, 1);

    const textElement = docHandle.doc().elements[attachedText.id()];
    expect(textElement).toBeTruthy();
    expect((textElement?.data as any).containerId).toBe(rect.id());

    harness.destroy();
  });

  test("attached multiline text grows rect height without changing width", async () => {
    const { harness, ctx, rect, docHandle } = await createAttachedRectTextHarness();

    const initialWidth = rect.width();
    const initialHeight = rect.height();

    ctx.setState("selection", [rect]);
    await flushCanvasEffects();
    ctx.hooks.keydown.call(dispatchKeyboardEvent(ctx.stage.container(), "keydown", { key: "Enter" }));
    await flushCanvasEffects();

    const textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    Object.defineProperty(textarea, "scrollHeight", { configurable: true, get: () => 180 });
    textarea.value = "line1\nline2\nline3\nline4\nline5";
    textarea.dispatchEvent(new Event("input"));
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    const attachedText = harness.staticForegroundLayer.findOne<Konva.Text>((node: Konva.Node) => node instanceof Konva.Text && TextPlugin.getContainerId(node) === rect.id())!;

    expect(rect.width()).toBeCloseTo(initialWidth, 5);
    expect(rect.height()).toBeGreaterThan(initialHeight);
    expect(attachedText.width()).toBeCloseTo(rect.width(), 5);

    const rectElement = docHandle.doc().elements[rect.id()];
    expect((rectElement?.data as any).w).toBeCloseTo(initialWidth, 5);
    expect((rectElement?.data as any).h).toBeCloseTo(rect.height(), 5);

    harness.destroy();
  });

  test("attached text edit does not shrink rect below edit-start height", async () => {
    const { harness, ctx, rect } = await createAttachedRectTextHarness();

    ctx.setState("selection", [rect]);
    await flushCanvasEffects();
    ctx.hooks.keydown.call(dispatchKeyboardEvent(ctx.stage.container(), "keydown", { key: "Enter" }));
    await flushCanvasEffects();

    let textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    Object.defineProperty(textarea, "scrollHeight", { configurable: true, get: () => 160 });
    textarea.value = "line1\nline2\nline3\nline4";
    textarea.dispatchEvent(new Event("input"));
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    const grownHeight = rect.height();

    ctx.hooks.keydown.call(dispatchKeyboardEvent(ctx.stage.container(), "keydown", { key: "Enter" }));
    await flushCanvasEffects();

    textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    Object.defineProperty(textarea, "scrollHeight", { configurable: true, get: () => 24 });
    textarea.value = "line1";
    textarea.dispatchEvent(new Event("input"));
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    expect(rect.height()).toBeCloseTo(grownHeight, 5);

    harness.destroy();
  });

  test("alt-dragging a rect clones its attached text with a new container id", async () => {
    const { harness, ctx, rect, docHandle } = await createAttachedRectTextHarness();

    ctx.setState("selection", [rect]);
    await flushCanvasEffects();
    ctx.hooks.keydown.call(dispatchKeyboardEvent(ctx.stage.container(), "keydown", { key: "Enter" }));
    await flushCanvasEffects();

    const originalText = harness.staticForegroundLayer.findOne<Konva.Text>((node: Konva.Node) => node instanceof Konva.Text && TextPlugin.getContainerId(node) === rect.id())!;
    const textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "clone me";
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    altDragRect(rect, { deltaX: 80, deltaY: 20 });
    await flushCanvasEffects();

    const rects = harness.staticForegroundLayer.find((node: Konva.Node) => node instanceof Konva.Rect) as Konva.Rect[];
    const texts = harness.staticForegroundLayer.find((node: Konva.Node) => node instanceof Konva.Text) as Konva.Text[];
    expect(rects.length).toBeGreaterThanOrEqual(2);
    expect(texts.length).toBeGreaterThanOrEqual(2);

    const clonedText = texts.find((node) => node.id() !== originalText.id())!;
    const clonedRect = rects.find((node) => node.id() === TextPlugin.getContainerId(clonedText))!;

    expect(TextPlugin.getContainerId(clonedText)).toBe(clonedRect.id());
    expect(clonedText.text()).toBe("clone me");
    expect(docHandle.doc().elements[clonedRect.id()]).toBeTruthy();
    expect(docHandle.doc().elements[clonedText.id()]).toBeTruthy();
    expect((docHandle.doc().elements[clonedText.id()].data as any).containerId).toBe(clonedRect.id());

    harness.destroy();
  });
});
