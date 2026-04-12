import Konva from "konva";
import type { TElement, TTextData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { describe, expect, test } from "vitest";
import { CanvasMode } from "../../../src/new-services/selection/enum";
import { THEME_ID_DARK } from "@vibecanvas/service-theme";
import { createMockDocHandle, createNewCanvasHarness, flushCanvasEffects } from "../../new-test-setup";

function createRectElement(overrides?: Partial<TElement>): TElement {
  return {
    id: "rect-1",
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
      backgroundColor: "#ef4444",
      opacity: 1,
      strokeWidth: 0,
    },
    data: {
      type: "rect",
      w: 180,
      h: 120,
    },
    ...overrides,
  } satisfies TElement;
}

function createDiamondElement(overrides?: Partial<TElement>): TElement {
  return {
    id: "diamond-1",
    x: 160,
    y: 200,
    rotation: 10,
    bindings: [],
    createdAt: 1,
    updatedAt: 2,
    locked: false,
    parentGroupId: null,
    zIndex: "z00000000",
    style: {
      backgroundColor: "#38bdf8",
      opacity: 0.9,
      strokeColor: "#0f172a",
      strokeWidth: 2,
    },
    data: {
      type: "diamond",
      w: 120,
      h: 80,
    },
    ...overrides,
  } satisfies TElement;
}

function createHookPointerEvent(type: string, args?: { shiftKey?: boolean }) {
  return {
    target: null,
    currentTarget: null,
    evt: new PointerEvent(type, { shiftKey: args?.shiftKey ?? false }),
    cancelBubble: false,
  } as unknown as Konva.KonvaEventObject<PointerEvent>;
}

function createHookMouseMoveEvent(args?: { shiftKey?: boolean }) {
  return {
    target: null,
    currentTarget: null,
    evt: new MouseEvent("pointermove", { shiftKey: args?.shiftKey ?? false }),
    cancelBubble: false,
  } as unknown as Konva.KonvaEventObject<MouseEvent>;
}

function withDynamicPointer(
  harness: Awaited<ReturnType<typeof createNewCanvasHarness>>,
  point: { x: number; y: number },
  callback: () => void,
) {
  const original = harness.dynamicLayer.getRelativePointerPosition.bind(harness.dynamicLayer);
  harness.dynamicLayer.getRelativePointerPosition = () => point;
  callback();
  harness.dynamicLayer.getRelativePointerPosition = original;
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

function fireKeydown(runtime: Awaited<ReturnType<typeof createNewCanvasHarness>>["runtime"], key: string) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });
  runtime.hooks.keydown.call(event);
}

function firePointerDoubleClick(node: Konva.Node) {
  node.fire("pointerdblclick", {
    target: node,
    currentTarget: node,
    evt: new MouseEvent("pointerdblclick", { bubbles: true }),
  });
}

function altDragShape(shape: Konva.Shape, args: { dx: number; dy: number }) {
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
    .find((child) => !beforeNodeIds.has(child._id) && child instanceof Konva.Shape) as Konva.Shape | undefined;
  if (!previewClone) {
    throw new Error("Expected preview clone after alt drag");
  }

  const before = previewClone.absolutePosition();
  previewClone.setAbsolutePosition({ x: before.x + args.dx, y: before.y + args.dy });
  previewClone.fire("dragend", {
    target: previewClone,
    currentTarget: previewClone,
    evt: new MouseEvent("dragend", { bubbles: true, altKey: true }),
  });
}

describe("new Shape2d plugin", () => {
  test("registers rectangle, diamond, and ellipse tools in editor registry", async () => {
    const harness = await createNewCanvasHarness();
    const editor = harness.runtime.services.require("editor");

    expect(editor.getTool("rectangle")?.shortcuts).toEqual(["2", "r"]);
    expect(editor.getTool("diamond")?.shortcuts).toEqual(["3", "d"]);
    expect(editor.getTool("ellipse")?.shortcuts).toEqual(["4", "o"]);

    await harness.destroy();
  });

  test("draw-create rectangle commits to scene and returns to select tool", async () => {
    const harness = await createNewCanvasHarness();
    const editor = harness.runtime.services.require("editor");
    const selection = harness.runtime.services.require("selection");

    editor.setActiveTool("rectangle");
    await flushCanvasEffects();

    withDynamicPointer(harness, { x: 120, y: 140 }, () => {
      harness.runtime.hooks.pointerDown.call(createHookPointerEvent("pointerdown"));
    });
    withDynamicPointer(harness, { x: 300, y: 260 }, () => {
      harness.runtime.hooks.pointerMove.call(createHookMouseMoveEvent());
    });
    harness.runtime.hooks.pointerUp.call(createHookPointerEvent("pointerup"));
    await flushCanvasEffects();

    const rectNode = harness.staticForegroundLayer.findOne<Konva.Rect>((candidate: Konva.Node) => {
      return candidate instanceof Konva.Rect && candidate.getAttr("vcShape2dType") === "rect";
    });
    const element = Object.values(harness.docHandle.doc().elements).find((candidate) => candidate.data?.type === "rect");

    expect(rectNode).toBeInstanceOf(Konva.Rect);
    expect(element?.data.type).toBe("rect");
    expect((element?.data as { w: number; h: number } | undefined)?.w).toBeCloseTo(180, 6);
    expect((element?.data as { w: number; h: number } | undefined)?.h).toBeCloseTo(120, 6);
    expect(element?.x).toBeCloseTo(120, 6);
    expect(element?.y).toBeCloseTo(140, 6);
    expect(editor.activeToolId).toBe("select");
    expect(selection.mode).toBe(CanvasMode.SELECT);
    expect(selection.selection.map((node) => node.id())).toEqual([rectNode!.id()]);

    await harness.destroy();
  });

  test("shift-draw ellipse keeps a 1:1 ratio", async () => {
    const harness = await createNewCanvasHarness();
    const editor = harness.runtime.services.require("editor");

    editor.setActiveTool("ellipse");
    await flushCanvasEffects();

    withDynamicPointer(harness, { x: 300, y: 220 }, () => {
      harness.runtime.hooks.pointerDown.call(createHookPointerEvent("pointerdown"));
    });
    withDynamicPointer(harness, { x: 420, y: 280 }, () => {
      harness.runtime.hooks.pointerMove.call(createHookMouseMoveEvent({ shiftKey: true }));
    });
    harness.runtime.hooks.pointerUp.call(createHookPointerEvent("pointerup"));
    await flushCanvasEffects();

    const element = Object.values(harness.docHandle.doc().elements).find((candidate) => candidate.data?.type === "ellipse");
    expect(element?.data.type).toBe("ellipse");
    expect((element?.data as { rx: number; ry: number } | undefined)?.rx).toBeCloseTo(60, 6);
    expect((element?.data as { rx: number; ry: number } | undefined)?.ry).toBeCloseTo(60, 6);
    expect(element?.x).toBeCloseTo(300, 6);
    expect(element?.y).toBeCloseTo(220, 6);

    await harness.destroy();
  });

  test("shared transformer bakes diamond scale into persisted size and resets node scale", async () => {
    const element = createDiamondElement();
    const docHandle = createMockDocHandle({
      elements: {
        [element.id]: structuredClone(element),
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    const selection = harness.runtime.services.require("selection");
    const node = harness.staticForegroundLayer.findOne<Konva.Line>(`#${element.id}`)!;
    const transformer = harness.dynamicLayer.find((candidate: Konva.Node) => candidate instanceof Konva.Transformer)[0] as Konva.Transformer;

    selection.setSelection([node]);
    selection.setFocusedNode(node);
    await flushCanvasEffects();

    transformer.fire("transformstart", {
      target: node,
      currentTarget: transformer,
      evt: new MouseEvent("transformstart", { bubbles: true }),
    });
    node.scaleX(1.5);
    node.scaleY(2);
    node.absolutePosition({ x: node.absolutePosition().x + 40, y: node.absolutePosition().y + 25 });
    transformer.fire("transformend", {
      target: node,
      currentTarget: transformer,
      evt: new MouseEvent("transformend", { bubbles: true }),
    });
    await flushCanvasEffects();

    const persisted = harness.docHandle.doc().elements[element.id];
    expect(persisted?.data.type).toBe("diamond");
    expect((persisted?.data as { w: number; h: number } | undefined)?.w).toBeCloseTo(180, 6);
    expect((persisted?.data as { w: number; h: number } | undefined)?.h).toBeCloseTo(160, 6);
    expect(persisted?.x).toBeCloseTo(200, 6);
    expect(persisted?.y).toBeCloseTo(225, 6);
    expect(node.scaleX()).toBeCloseTo(1, 6);
    expect(node.scaleY()).toBeCloseTo(1, 6);

    await harness.destroy();
  });

  test("Enter on selected rect creates attached text and persists containerId", async () => {
    const rectElement = createRectElement({ id: "rect-with-text" });
    const docHandle = createMockDocHandle({
      elements: {
        [rectElement.id]: structuredClone(rectElement),
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    const selection = harness.runtime.services.require("selection");
    const rectNode = harness.staticForegroundLayer.findOne<Konva.Rect>(`#${rectElement.id}`)!;

    selection.setSelection([rectNode]);
    selection.setFocusedNode(rectNode);
    await flushCanvasEffects();

    fireKeydown(harness.runtime, "Enter");
    await flushCanvasEffects();

    const textarea = harness.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.style.outline).toBe("none");
    expect(parseFloat(textarea.style.width)).toBeCloseTo(rectNode.width(), 4);
    expect(parseFloat(textarea.style.height)).toBeCloseTo(rectNode.height(), 4);
    textarea.value = "hello rect";
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    const textNode = harness.staticForegroundLayer.findOne<Konva.Text>((candidate: Konva.Node) => {
      return candidate instanceof Konva.Text && candidate.getAttr("vcContainerId") === rectElement.id;
    });
    expect(textNode).toBeInstanceOf(Konva.Text);
    expect(textNode?.listening()).toBe(false);

    const persistedText = Object.values(harness.docHandle.doc().elements).find((candidate) => {
      return candidate.data.type === "text" && (candidate.data as TTextData).containerId === rectElement.id;
    });
    expect((persistedText?.data as TTextData | undefined)?.text).toBe("hello rect");

    await harness.destroy();
  });

  test("transform keeps attached rect text centered while resizing", async () => {
    const rectElement = createRectElement({ id: "rect-transform-text" });
    const docHandle = createMockDocHandle({
      elements: {
        [rectElement.id]: structuredClone(rectElement),
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    const selection = harness.runtime.services.require("selection");
    const editor = harness.runtime.services.require("editor");
    const rectNode = harness.staticForegroundLayer.findOne<Konva.Rect>(`#${rectElement.id}`)!;

    selection.setSelection([rectNode]);
    selection.setFocusedNode(rectNode);
    await flushCanvasEffects();

    fireKeydown(harness.runtime, "Enter");
    await flushCanvasEffects();

    let textarea = harness.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "resize me";
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    const textNode = harness.staticForegroundLayer.findOne<Konva.Text>((candidate: Konva.Node) => {
      return candidate instanceof Konva.Text && candidate.getAttr("vcContainerId") === rectElement.id;
    })!;

    selection.setSelection([rectNode]);
    selection.setFocusedNode(rectNode);
    await flushCanvasEffects();

    const transformer = editor.transformer!;
    rectNode.scale({ x: 1.5, y: 1.25 });
    rectNode.fire("transform", { target: rectNode, currentTarget: rectNode, evt: new Event("transform") }, true);
    await flushCanvasEffects();

    expect(textNode.width()).toBeCloseTo(rectNode.width() * rectNode.scaleX(), 4);
    expect(textNode.height()).toBeCloseTo(rectNode.height() * rectNode.scaleY(), 4);
    expect(textNode.x()).toBeCloseTo(rectNode.x(), 4);
    expect(textNode.y()).toBeCloseTo(rectNode.y(), 4);

    transformer.fire("transformend", { target: transformer, currentTarget: transformer, evt: new Event("transformend") }, true);
    await flushCanvasEffects();

    await harness.destroy();
  });

  test("clearing attached rect text removes the text node on commit", async () => {
    const rectElement = createRectElement({ id: "rect-clear-text" });
    const docHandle = createMockDocHandle({
      elements: {
        [rectElement.id]: structuredClone(rectElement),
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    const selection = harness.runtime.services.require("selection");
    const rectNode = harness.staticForegroundLayer.findOne<Konva.Rect>(`#${rectElement.id}`)!;

    selection.setSelection([rectNode]);
    selection.setFocusedNode(rectNode);
    await flushCanvasEffects();

    fireKeydown(harness.runtime, "Enter");
    await flushCanvasEffects();

    let textarea = harness.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "will clear";
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    selection.setSelection([rectNode]);
    selection.setFocusedNode(rectNode);
    await flushCanvasEffects();

    fireKeydown(harness.runtime, "Enter");
    await flushCanvasEffects();

    textarea = harness.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "";
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    const textNode = harness.staticForegroundLayer.findOne<Konva.Text>((candidate: Konva.Node) => {
      return candidate instanceof Konva.Text && candidate.getAttr("vcContainerId") === rectElement.id;
    });
    expect(textNode ?? null).toBeNull();
    expect(Object.values(docHandle.doc().elements).find((candidate) => {
      return candidate.data.type === "text" && (candidate.data as TTextData).containerId === rectElement.id;
    })).toBeUndefined();

    await harness.destroy();
  });

  test("Escape commits rect attached text edit and keeps geometry stable", async () => {
    const rectElement = createRectElement({ id: "rect-escape-text" });
    const docHandle = createMockDocHandle({
      elements: {
        [rectElement.id]: structuredClone(rectElement),
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    const selection = harness.runtime.services.require("selection");
    const rectNode = harness.staticForegroundLayer.findOne<Konva.Rect>(`#${rectElement.id}`)!;

    selection.setSelection([rectNode]);
    selection.setFocusedNode(rectNode);
    await flushCanvasEffects();

    fireKeydown(harness.runtime, "Enter");
    await flushCanvasEffects();

    const textarea = harness.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "commit on escape";
    textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await flushCanvasEffects();

    expect(harness.stage.container().querySelector("textarea")).toBeNull();

    const textNode = harness.staticForegroundLayer.findOne<Konva.Text>((candidate: Konva.Node) => {
      return candidate instanceof Konva.Text && candidate.getAttr("vcContainerId") === rectElement.id;
    })!;
    expect(textNode.width()).toBeCloseTo(rectNode.width(), 4);
    expect(textNode.height()).toBeCloseTo(rectNode.height(), 4);
    expect(textNode.text()).toBe("commit on escape");

    await harness.destroy();
  });

  test("Enter on selected ellipse creates centered attached text and commits on blur", async () => {
    const ellipseElement = {
      ...createRectElement({ id: "ellipse-with-text" }),
      data: { type: "ellipse", rx: 90, ry: 60 },
    } satisfies TElement;
    const docHandle = createMockDocHandle({
      elements: {
        [ellipseElement.id]: structuredClone(ellipseElement),
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    const selection = harness.runtime.services.require("selection");
    const ellipseNode = harness.staticForegroundLayer.findOne<Konva.Ellipse>(`#${ellipseElement.id}`)!;

    selection.setSelection([ellipseNode]);
    selection.setFocusedNode(ellipseNode);
    await flushCanvasEffects();

    fireKeydown(harness.runtime, "Enter");
    await flushCanvasEffects();

    const textarea = harness.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "ellipse text";
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    const textNode = harness.staticForegroundLayer.findOne<Konva.Text>((candidate: Konva.Node) => {
      return candidate instanceof Konva.Text && candidate.getAttr("vcContainerId") === ellipseElement.id;
    })!;
    expect(textNode.align()).toBe("center");
    expect(textNode.verticalAlign()).toBe("middle");
    expect(textNode.width()).toBeCloseTo(ellipseNode.radiusX() * 2, 4);
    expect(textNode.height()).toBeCloseTo(ellipseNode.radiusY() * 2, 4);
    expect(textNode.text()).toBe("ellipse text");

    await harness.destroy();
  });

  test("double click selected diamond opens attached text edit", async () => {
    const diamondElement = createDiamondElement({ id: "diamond-with-text", rotation: 0 });
    const docHandle = createMockDocHandle({
      elements: {
        [diamondElement.id]: structuredClone(diamondElement),
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    const selection = harness.runtime.services.require("selection");
    const diamondNode = harness.staticForegroundLayer.findOne<Konva.Line>(`#${diamondElement.id}`)!;

    selection.setSelection([diamondNode]);
    selection.setFocusedNode(diamondNode);
    await flushCanvasEffects();

    firePointerDoubleClick(diamondNode);
    await flushCanvasEffects();

    const textarea = harness.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    textarea.value = "diamond text";
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    const textNode = harness.staticForegroundLayer.findOne<Konva.Text>((candidate: Konva.Node) => {
      return candidate instanceof Konva.Text && candidate.getAttr("vcContainerId") === diamondElement.id;
    })!;
    expect(textNode.text()).toBe("diamond text");
    expect(textNode.align()).toBe("center");
    expect(textNode.verticalAlign()).toBe("middle");

    await harness.destroy();
  });

  test("double click selected rect opens attached text edit and delete removes rect plus attached text", async () => {
    const rectElement = createRectElement({ id: "rect-delete-with-text" });
    const docHandle = createMockDocHandle({
      elements: {
        [rectElement.id]: structuredClone(rectElement),
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    const selection = harness.runtime.services.require("selection");
    const rectNode = harness.staticForegroundLayer.findOne<Konva.Rect>(`#${rectElement.id}`)!;

    selection.setSelection([rectNode]);
    selection.setFocusedNode(rectNode);
    await flushCanvasEffects();

    firePointerDoubleClick(rectNode);
    await flushCanvasEffects();

    const textarea = harness.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "delete me too";
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    selection.setSelection([rectNode]);
    selection.setFocusedNode(rectNode);
    await flushCanvasEffects();

    fireKeydown(harness.runtime, "Delete");
    await flushCanvasEffects();

    expect(harness.staticForegroundLayer.findOne(`#${rectElement.id}`)).toBeFalsy();
    expect(Object.values(harness.docHandle.doc().elements)).toHaveLength(0);

    await harness.destroy();
  });

  test("alt-drag rect clone also clones attached text and undo redo works", async () => {
    const rectElement = createRectElement({ id: "rect-clone-with-text" });
    const docHandle = createMockDocHandle({
      elements: {
        [rectElement.id]: structuredClone(rectElement),
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    const history = harness.runtime.services.require("history");
    const selection = harness.runtime.services.require("selection");
    const rectNode = harness.staticForegroundLayer.findOne<Konva.Rect>(`#${rectElement.id}`)!;

    selection.setSelection([rectNode]);
    selection.setFocusedNode(rectNode);
    await flushCanvasEffects();

    fireKeydown(harness.runtime, "Enter");
    await flushCanvasEffects();
    const textarea = harness.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "clone text";
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    altDragShape(rectNode, { dx: 80, dy: 30 });
    await flushCanvasEffects();

    const allElements = Object.values(harness.docHandle.doc().elements);
    const rects = allElements.filter((candidate) => candidate.data.type === "rect");
    const texts = allElements.filter((candidate) => candidate.data.type === "text");
    expect(rects).toHaveLength(2);
    expect(texts).toHaveLength(2);

    history.undo();
    await flushCanvasEffects();
    expect(Object.values(harness.docHandle.doc().elements).filter((candidate) => candidate.data.type === "rect")).toHaveLength(1);
    expect(Object.values(harness.docHandle.doc().elements).filter((candidate) => candidate.data.type === "text")).toHaveLength(1);

    history.redo();
    await flushCanvasEffects();
    expect(Object.values(harness.docHandle.doc().elements).filter((candidate) => candidate.data.type === "rect")).toHaveLength(2);
    expect(Object.values(harness.docHandle.doc().elements).filter((candidate) => candidate.data.type === "text")).toHaveLength(2);

    await harness.destroy();
  });

  test("shape2d token colors repaint on theme change and preserve stored token style", async () => {
    const docHandle = createMockDocHandle({
      elements: {
        "rect-token": createRectElement({
          id: "rect-token",
          style: { backgroundColor: "@red/300", strokeColor: "@gray/900", strokeWidth: 2, opacity: 1 },
        }),
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    const theme = harness.runtime.services.require("theme");
    const editor = harness.runtime.services.require("editor");
    const rectNode = harness.staticForegroundLayer.findOne<Konva.Rect>("#rect-token")!;

    expect(rectNode.fill()).toBe("#fca5a5");
    expect(editor.toElement(rectNode)?.style.backgroundColor).toBe("@red/300");

    theme.setTheme(THEME_ID_DARK);
    await flushCanvasEffects();

    expect(rectNode.fill()).toBe("#7f1d1d");
    expect(editor.toElement(rectNode)?.style.strokeColor).toBe("@gray/900");

    await harness.destroy();
  });

  test("group plugin can group rect nodes and scene hydrator restores grouped shape2d nodes", async () => {
    const rectA = createRectElement({ id: "rect-a", x: 40, y: 60, zIndex: "z00000000" });
    const rectB = createRectElement({ id: "rect-b", x: 260, y: 180, zIndex: "z00000001" });
    const docHandle = createMockDocHandle({
      elements: {
        [rectA.id]: structuredClone(rectA),
        [rectB.id]: structuredClone(rectB),
      },
    });

    const firstHarness = await createNewCanvasHarness({ docHandle });
    const selection = firstHarness.runtime.services.require("selection");
    const nodeA = firstHarness.staticForegroundLayer.findOne<Konva.Rect>("#rect-a")!;
    const nodeB = firstHarness.staticForegroundLayer.findOne<Konva.Rect>("#rect-b")!;

    selection.setSelection([nodeA, nodeB]);
    selection.setFocusedNode(nodeB);
    fireGroupShortcut(firstHarness.runtime);
    await flushCanvasEffects();

    const groupedNode = firstHarness.staticForegroundLayer.findOne<Konva.Group>((candidate: Konva.Node) => {
      return candidate instanceof Konva.Group;
    })!;
    expect(groupedNode).toBeTruthy();
    expect(docHandle.doc().elements[rectA.id]?.parentGroupId).toBe(groupedNode.id());
    expect(docHandle.doc().elements[rectB.id]?.parentGroupId).toBe(groupedNode.id());

    await firstHarness.destroy();

    const secondHarness = await createNewCanvasHarness({ docHandle });
    const rehydratedGroup = secondHarness.staticForegroundLayer.findOne<Konva.Group>(`#${groupedNode.id()}`)!;
    const rehydratedRectA = secondHarness.staticForegroundLayer.findOne<Konva.Rect>("#rect-a")!;
    const rehydratedRectB = secondHarness.staticForegroundLayer.findOne<Konva.Rect>("#rect-b")!;

    expect(rehydratedGroup).toBeTruthy();
    expect(rehydratedRectA.getParent()).toBe(rehydratedGroup);
    expect(rehydratedRectB.getParent()).toBe(rehydratedGroup);
    expect(rehydratedGroup.getChildren().filter((candidate) => candidate instanceof Konva.Rect)).toHaveLength(2);

    await secondHarness.destroy();
  });
});
