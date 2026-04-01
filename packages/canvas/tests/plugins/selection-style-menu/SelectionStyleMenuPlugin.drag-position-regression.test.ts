import Konva from "konva";
import type { DocHandle } from "@automerge/automerge-repo";
import type { TCanvasDoc, TElement } from "@vibecanvas/shell/automerge/index";
import { describe, expect, test } from "vitest";
import { GroupPlugin, SelectionStyleMenuPlugin, Shape1dPlugin, Shape2dPlugin, TextPlugin, type IPluginContext } from "../../../src/plugins";
import { createCanvasTestHarness, createMockDocHandle, flushCanvasEffects } from "../../test-setup";

function dragNode(node: Konva.Node, args: { dx: number; dy: number }) {
  const before = node.absolutePosition();
  node.fire("dragstart", { target: node, currentTarget: node, evt: new MouseEvent("dragstart", { bubbles: true }) });
  node.setAbsolutePosition({ x: before.x + args.dx, y: before.y + args.dy });
  node.fire("dragmove", { target: node, currentTarget: node, evt: new MouseEvent("dragmove", { bubbles: true }) });
  node.fire("dragend", { target: node, currentTarget: node, evt: new MouseEvent("dragend", { bubbles: true }) });
}

async function clickButtonByTitle(container: HTMLElement, title: string, index = 0) {
  const button = [...container.querySelectorAll("button")].filter((candidate) => candidate.getAttribute("title") === title)[index];
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Expected button with title ${title} at index ${index}`);
  }

  button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await flushCanvasEffects();
}

function expectPointClose(actual: { x: number; y: number }, expected: { x: number; y: number }) {
  expect(actual.x).toBeCloseTo(expected.x, 8);
  expect(actual.y).toBeCloseTo(expected.y, 8);
}

function expectDocElementPosition(docHandle: DocHandle<TCanvasDoc>, id: string, expected: { x: number; y: number }) {
  const element = docHandle.doc().elements[id];
  expect(element).toBeTruthy();
  expect(element?.x).toBeCloseTo(expected.x, 8);
  expect(element?.y).toBeCloseTo(expected.y, 8);
}

function createRectElement(args?: Partial<TElement>): TElement {
  return {
    id: args?.id ?? "rect-1",
    x: args?.x ?? 80,
    y: args?.y ?? 60,
    rotation: args?.rotation ?? 0,
    bindings: [],
    locked: false,
    parentGroupId: args?.parentGroupId ?? null,
    zIndex: args?.zIndex ?? "a0",
    createdAt: 1,
    updatedAt: 1,
    data: { type: "rect", w: 120, h: 80 },
    style: {
      backgroundColor: "#ff0000",
      strokeColor: "#00ff00",
      strokeWidth: 2,
      opacity: 0.75,
    },
    ...args,
  } as TElement;
}

function createDiamondElement(args?: Partial<TElement>): TElement {
  return {
    id: args?.id ?? "diamond-1",
    x: args?.x ?? 110,
    y: args?.y ?? 90,
    rotation: args?.rotation ?? 0,
    bindings: [],
    locked: false,
    parentGroupId: args?.parentGroupId ?? null,
    zIndex: args?.zIndex ?? "a0",
    createdAt: 1,
    updatedAt: 1,
    data: { type: "diamond", w: 120, h: 90 },
    style: {
      backgroundColor: "#fef3c7",
      strokeColor: "#92400e",
      strokeWidth: 2,
      opacity: 0.85,
    },
    ...args,
  } as TElement;
}

function createTextElement(args?: Partial<TElement>): TElement {
  return {
    id: args?.id ?? "text-1",
    x: args?.x ?? 50,
    y: args?.y ?? 40,
    rotation: args?.rotation ?? 0,
    bindings: [],
    locked: false,
    parentGroupId: args?.parentGroupId ?? null,
    zIndex: args?.zIndex ?? "a0",
    createdAt: 1,
    updatedAt: 1,
    style: {
      strokeColor: "#111111",
      opacity: 0.9,
    },
    data: {
      type: "text",
      w: 180,
      h: 28,
      text: "Hello",
      originalText: "Hello",
      fontSize: 16,
      fontFamily: "Arial, sans-serif",
      textAlign: "left",
      verticalAlign: "top",
      lineHeight: 1.2,
      link: null,
      containerId: null,
      autoResize: false,
    },
    ...args,
  } as TElement;
}

function createArrowElement(args?: Partial<TElement>): TElement {
  return {
    id: args?.id ?? "arrow-1",
    x: args?.x ?? 100,
    y: args?.y ?? 120,
    rotation: args?.rotation ?? 0,
    bindings: [],
    locked: false,
    parentGroupId: args?.parentGroupId ?? null,
    zIndex: args?.zIndex ?? "a0",
    createdAt: 1,
    updatedAt: 1,
    style: {
      strokeColor: "#111111",
      opacity: 0.9,
      strokeWidth: 4,
    },
    data: {
      type: "arrow",
      lineType: "straight",
      points: [[0, 0], [120, 20]],
      startBinding: null,
      endBinding: null,
      startCap: "none",
      endCap: "arrow",
    },
    ...args,
  } as TElement;
}

describe("SelectionStyleMenuPlugin drag/style regressions", () => {
  test("rect keeps dragged position after fill change", async () => {
    const docHandle = createMockDocHandle() as DocHandle<TCanvasDoc>;

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new SelectionStyleMenuPlugin(), new Shape2dPlugin(), new TextPlugin()],
      initializeScene(context) {
        const rect = Shape2dPlugin.createRectFromElement(createRectElement());
        Shape2dPlugin.setupShapeListeners(context, rect);
        rect.draggable(true);
        context.staticForegroundLayer.add(rect);
        context.setState("selection", [rect]);
      },
    });

    await flushCanvasEffects();
    const rect = harness.staticForegroundLayer.findOne<Konva.Rect>("#rect-1")!;

    dragNode(rect, { dx: 120, dy: 35 });
    await flushCanvasEffects();

    const draggedPosition = { ...rect.absolutePosition() };
    await clickButtonByTitle(harness.stage.container(), "Pink");

    expectPointClose(rect.absolutePosition(), draggedPosition);
    expect(rect.fill()).toBe("#f8d7da");
    expectDocElementPosition(docHandle, rect.id(), draggedPosition);
    harness.destroy();
  });

  test("diamond keeps dragged position after fill change", async () => {
    const docHandle = createMockDocHandle() as DocHandle<TCanvasDoc>;

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new SelectionStyleMenuPlugin(), new Shape2dPlugin(), new TextPlugin()],
      initializeScene(context) {
        const diamond = Shape2dPlugin.createDiamondFromElement(createDiamondElement());
        Shape2dPlugin.setupShapeListeners(context, diamond);
        diamond.draggable(true);
        context.staticForegroundLayer.add(diamond);
        context.setState("selection", [diamond]);
      },
    });

    await flushCanvasEffects();
    const diamond = harness.staticForegroundLayer.findOne<Konva.Line>("#diamond-1")!;

    dragNode(diamond, { dx: 90, dy: 55 });
    await flushCanvasEffects();

    const draggedPosition = { ...diamond.absolutePosition() };
    await clickButtonByTitle(harness.stage.container(), "Pink");

    expectPointClose(diamond.absolutePosition(), draggedPosition);
    expect(diamond.fill()).toBe("#f8d7da");
    expectDocElementPosition(docHandle, diamond.id(), draggedPosition);
    harness.destroy();
  });

  test("text keeps dragged position after font change", async () => {
    const docHandle = createMockDocHandle() as DocHandle<TCanvasDoc>;

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new SelectionStyleMenuPlugin(), new Shape2dPlugin(), new TextPlugin()],
      initializeScene(context) {
        const textNode = TextPlugin.createTextNode(createTextElement());
        TextPlugin.setupShapeListeners(context, textNode);
        textNode.draggable(true);
        context.staticForegroundLayer.add(textNode);
        context.setState("selection", [textNode]);
      },
    });

    await flushCanvasEffects();
    const textNode = harness.staticForegroundLayer.findOne<Konva.Text>("#text-1")!;

    dragNode(textNode, { dx: 70, dy: 45 });
    await flushCanvasEffects();

    const draggedPosition = { ...textNode.absolutePosition() };
    await clickButtonByTitle(harness.stage.container(), "Mono");

    expectPointClose(textNode.absolutePosition(), draggedPosition);
    expect(textNode.fontFamily()).toBe("monospace");
    expectDocElementPosition(docHandle, textNode.id(), draggedPosition);
    harness.destroy();
  });

  test("arrow keeps dragged position after curve change", async () => {
    const docHandle = createMockDocHandle() as DocHandle<TCanvasDoc>;

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new SelectionStyleMenuPlugin(), new Shape1dPlugin(), new Shape2dPlugin(), new TextPlugin()],
      initializeScene(context) {
        const arrow = Shape1dPlugin.createShapeFromElement(createArrowElement());
        Shape1dPlugin.setupShapeListeners(context, arrow);
        arrow.draggable(true);
        context.staticForegroundLayer.add(arrow);
        context.setState("selection", [arrow]);
      },
    });

    await flushCanvasEffects();
    const arrow = harness.staticForegroundLayer.findOne<Konva.Shape>("#arrow-1")!;

    dragNode(arrow, { dx: 95, dy: 25 });
    await flushCanvasEffects();

    const draggedPosition = { ...arrow.absolutePosition() };
    await clickButtonByTitle(harness.stage.container(), "Curved");

    const roundTrip = Shape1dPlugin.toTElement(arrow as any);
    expectPointClose(arrow.absolutePosition(), draggedPosition);
    expect(roundTrip.data.type).toBe("arrow");
    if (roundTrip.data.type === "arrow") {
      expect(roundTrip.data.lineType).toBe("curved");
    }
    expectDocElementPosition(docHandle, arrow.id(), draggedPosition);
    harness.destroy();
  });

  test("group selection keeps dragged child positions after fill change", async () => {
    let pluginContext!: IPluginContext;
    const docHandle = createMockDocHandle() as DocHandle<TCanvasDoc>;
    const groupPlugin = new GroupPlugin();

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new SelectionStyleMenuPlugin(), new Shape2dPlugin(), new TextPlugin(), groupPlugin],
      initializeScene(context) {
        pluginContext = context;

        const rect = Shape2dPlugin.createRectFromElement(createRectElement({ id: "group-rect", x: 80, y: 60 }));
        const diamond = Shape2dPlugin.createDiamondFromElement(createDiamondElement({ id: "group-diamond", x: 250, y: 140 }));
        Shape2dPlugin.setupShapeListeners(context, rect);
        Shape2dPlugin.setupShapeListeners(context, diamond);
        rect.draggable(true);
        diamond.draggable(true);
        context.staticForegroundLayer.add(rect);
        context.staticForegroundLayer.add(diamond);

        const group = GroupPlugin.group(context, [rect, diamond]);
        context.setState("selection", [group]);
      },
    });

    await flushCanvasEffects();
    const selectedGroup = pluginContext.state.selection[0];
    expect(selectedGroup).toBeInstanceOf(Konva.Group);
    const group = selectedGroup as Konva.Group;
    const rect = harness.staticForegroundLayer.findOne<Konva.Rect>("#group-rect")!;
    const diamond = harness.staticForegroundLayer.findOne<Konva.Line>("#group-diamond")!;

    dragNode(group, { dx: 85, dy: 65 });
    await flushCanvasEffects();

    const rectDraggedPosition = { ...rect.absolutePosition() };
    const diamondDraggedPosition = { ...diamond.absolutePosition() };
    await clickButtonByTitle(harness.stage.container(), "Pink");

    expectPointClose(rect.absolutePosition(), rectDraggedPosition);
    expectPointClose(diamond.absolutePosition(), diamondDraggedPosition);
    expect(rect.fill()).toBe("#f8d7da");
    expect(diamond.fill()).toBe("#f8d7da");
    expectDocElementPosition(docHandle, rect.id(), rectDraggedPosition);
    expectDocElementPosition(docHandle, diamond.id(), diamondDraggedPosition);
    harness.destroy();
  });
});
