import Konva from "konva";
import type { TArrowData, TElement, TLineData } from "@vibecanvas/shell/automerge/index";
import { describe, expect, test } from "vitest";
import { CustomEvents } from "../../../src/custom-events";
import { SceneHydratorPlugin, SelectPlugin, Shape1dPlugin, TransformPlugin, type IPluginContext } from "../../../src/plugins";
import { CanvasMode } from "../../../src/services/canvas/enum";
import { createCanvasTestHarness, createMockDocHandle, flushCanvasEffects } from "../../test-setup";

function createPointerEvent(type: string) {
  return {
    evt: new PointerEvent(type),
  } as Konva.KonvaEventObject<PointerEvent>;
}

function createMouseMoveEvent() {
  return {
    evt: new MouseEvent("pointermove"),
  } as Konva.KonvaEventObject<MouseEvent>;
}

function fireKeydown(context: IPluginContext, key: string) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  Object.defineProperty(event, "target", { configurable: true, value: context.stage.container() });
  context.hooks.keydown.call(event);
}

function withDynamicPointer(context: IPluginContext, point: { x: number; y: number }, callback: () => void) {
  const original = context.dynamicLayer.getRelativePointerPosition.bind(context.dynamicLayer);
  context.dynamicLayer.getRelativePointerPosition = () => point;
  callback();
  context.dynamicLayer.getRelativePointerPosition = original;
}

function createShape1dElement(args?: {
  id?: string;
  type?: "line" | "arrow";
  lineType?: "straight" | "curved";
  points?: Array<[number, number]>;
}) {
  const type = args?.type ?? "line";
  const data: TLineData | TArrowData = type === "arrow"
    ? {
        type: "arrow",
        lineType: args?.lineType ?? "curved",
        points: args?.points ?? [[0, 0], [50, 15], [110, -10], [180, 30]],
        startBinding: null,
        endBinding: null,
        startCap: "dot",
        endCap: "arrow",
      }
    : {
        type: "line",
        lineType: args?.lineType ?? "straight",
        points: args?.points ?? [[0, 0], [150, 40]],
        startBinding: null,
        endBinding: null,
      };

  return {
    id: args?.id ?? `${type}-1`,
    x: 120,
    y: 140,
    rotation: 0,
    bindings: [],
    createdAt: 1,
    updatedAt: 1,
    locked: false,
    parentGroupId: null,
    zIndex: "",
    style: {
      strokeColor: "#0f172a",
      opacity: 0.92,
      strokeWidth: 4,
    },
    data,
  } satisfies TElement;
}

function mountShape1dNode(context: IPluginContext, element: TElement) {
  const node = context.capabilities.createShapeFromTElement?.(element);
  if (!Shape1dPlugin.isShape1dNode(node)) {
    throw new Error("Expected Shape1dPlugin to create a shape1d node");
  }

  context.staticForegroundLayer.add(node);
  return node;
}

function dragNode(node: Konva.Shape, args: { dx: number; dy: number; altKey?: boolean }) {
  const before = node.absolutePosition();
  node.fire("dragstart", {
    target: node,
    currentTarget: node,
    evt: new MouseEvent("dragstart", { bubbles: true, altKey: args.altKey }),
  });
  node.setAbsolutePosition({ x: before.x + args.dx, y: before.y + args.dy });
  node.fire("dragmove", {
    target: node,
    currentTarget: node,
    evt: new MouseEvent("dragmove", { bubbles: true, altKey: args.altKey }),
  });
  node.fire("dragend", {
    target: node,
    currentTarget: node,
    evt: new MouseEvent("dragend", { bubbles: true, altKey: args.altKey }),
  });
}

function getAnchorHandles(layer: Konva.Layer) {
  return layer.find((node: Konva.Node) => {
    return node instanceof Konva.Circle && node.getAttr("vcShape1dHandleKind") === "anchor";
  }) as Konva.Circle[];
}

function getInsertHandles(layer: Konva.Layer) {
  return layer.find((node: Konva.Node) => {
    return node instanceof Konva.Circle && node.getAttr("vcShape1dHandleKind") === "insert";
  }) as Konva.Circle[];
}

function dragHandle(context: IPluginContext, handle: Konva.Circle, point: { x: number; y: number }) {
  handle.fire("dragstart", { target: handle, currentTarget: handle, evt: new MouseEvent("dragstart", { bubbles: true }) });
  withDynamicPointer(context, point, () => {
    handle.fire("dragmove", { target: handle, currentTarget: handle, evt: new MouseEvent("dragmove", { bubbles: true }) });
  });
  handle.fire("dragend", { target: handle, currentTarget: handle, evt: new MouseEvent("dragend", { bubbles: true }) });
}

describe("Shape1dPlugin", () => {
  test("Escape cancels an in-progress line preview", async () => {
    let context!: IPluginContext;
    const docHandle = createMockDocHandle();

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new Shape1dPlugin()],
      initializeScene(ctx) {
        context = ctx;
      },
    });

    context.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "line");
    context.setState("mode", CanvasMode.DRAW_CREATE);

    withDynamicPointer(context, { x: 120, y: 140 }, () => {
      context.hooks.pointerDown.call(createPointerEvent("pointerdown"));
    });
    withDynamicPointer(context, { x: 260, y: 200 }, () => {
      context.hooks.pointerMove.call(createMouseMoveEvent());
    });

    expect(harness.dynamicLayer.find((node: Konva.Node) => Shape1dPlugin.isShape1dNode(node))).toHaveLength(1);

    fireKeydown(context, "Escape");
    context.hooks.pointerUp.call(createPointerEvent("pointerup"));
    await flushCanvasEffects();

    expect(harness.dynamicLayer.find((node: Konva.Node) => Shape1dPlugin.isShape1dNode(node))).toHaveLength(0);
    expect(harness.staticForegroundLayer.find((node: Konva.Node) => Shape1dPlugin.isShape1dNode(node))).toHaveLength(0);
    expect(Object.keys(docHandle.doc().elements)).toHaveLength(0);
    expect(context.state.mode).toBe(CanvasMode.SELECT);

    harness.destroy();
  });

  test("draw-create commits an arrow element and create history supports undo/redo", async () => {
    let context!: IPluginContext;
    const docHandle = createMockDocHandle();

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new Shape1dPlugin()],
      initializeScene(ctx) {
        context = ctx;
      },
    });

    context.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "arrow");
    context.setState("mode", CanvasMode.DRAW_CREATE);

    withDynamicPointer(context, { x: 120, y: 140 }, () => {
      context.hooks.pointerDown.call(createPointerEvent("pointerdown"));
    });
    withDynamicPointer(context, { x: 280, y: 220 }, () => {
      context.hooks.pointerMove.call(createMouseMoveEvent());
    });
    context.hooks.pointerUp.call(createPointerEvent("pointerup"));
    await flushCanvasEffects();

    const elements = Object.values(docHandle.doc().elements);
    expect(elements).toHaveLength(1);
    expect(elements[0]?.data.type).toBe("arrow");

    const createdId = elements[0]!.id;
    context.history.undo();
    await flushCanvasEffects();
    expect(docHandle.doc().elements[createdId]).toBeUndefined();

    context.history.redo();
    await flushCanvasEffects();
    expect(docHandle.doc().elements[createdId]?.data.type).toBe("arrow");

    harness.destroy();
  });

  test("pointerCancel aborts an in-progress draft", async () => {
    let context!: IPluginContext;

    const harness = await createCanvasTestHarness({
      plugins: [new Shape1dPlugin()],
      initializeScene(ctx) {
        context = ctx;
      },
    });

    context.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "line");
    context.setState("mode", CanvasMode.DRAW_CREATE);

    withDynamicPointer(context, { x: 90, y: 120 }, () => {
      context.hooks.pointerDown.call(createPointerEvent("pointerdown"));
    });
    withDynamicPointer(context, { x: 180, y: 160 }, () => {
      context.hooks.pointerMove.call(createMouseMoveEvent());
    });

    context.hooks.pointerCancel.call(createPointerEvent("pointercancel"));
    await flushCanvasEffects();

    expect(harness.dynamicLayer.find((node: Konva.Node) => Shape1dPlugin.isShape1dNode(node))).toHaveLength(0);
    expect(context.state.mode).toBe(CanvasMode.SELECT);

    harness.destroy();
  });

  test("SceneHydrator mounts persisted curved arrows and update/toElement preserve metadata", async () => {
    let context!: IPluginContext;
    const element = createShape1dElement({ type: "arrow", lineType: "curved" });
    const docHandle = createMockDocHandle({
      elements: {
        [element.id]: structuredClone(element),
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new Shape1dPlugin(), new SceneHydratorPlugin()],
      initializeScene(ctx) {
        context = ctx;
      },
    });

    const node = harness.staticForegroundLayer.findOne((candidate: Konva.Node) => {
      return Shape1dPlugin.isShape1dNode(candidate) && candidate.id() === element.id;
    });
    expect(Shape1dPlugin.isShape1dNode(node)).toBe(true);
    if (!Shape1dPlugin.isShape1dNode(node)) throw new Error("Expected hydrated shape1d node");

    const updated = {
      ...element,
      data: {
        ...element.data,
        points: [[0, 0], [60, 35], [130, 10], [220, 60]],
      },
      style: {
        ...element.style,
        strokeWidth: 7,
      },
    } satisfies TElement;

    context.capabilities.updateShapeFromTElement?.(updated);
    const roundTrip = Shape1dPlugin.toTElement(node);

    expect(roundTrip.data.type).toBe("arrow");
    if (roundTrip.data.type !== "arrow") throw new Error("Expected arrow data");
    expect((roundTrip.data as TArrowData).lineType).toBe("curved");
    expect((roundTrip.data as TArrowData).endCap).toBe("arrow");
    expect(roundTrip.data.points).toEqual((updated.data as TArrowData).points);
    expect(roundTrip.style.strokeWidth).toBe(7);
    expect(node.getClientRect().width).toBeGreaterThan(0);

    harness.destroy();
  });

  test("drag updates persisted position and drag history supports undo/redo", async () => {
    let context!: IPluginContext;
    const element = createShape1dElement();
    const docHandle = createMockDocHandle({
      elements: {
        [element.id]: structuredClone(element),
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new Shape1dPlugin()],
      initializeScene(ctx) {
        context = ctx;
        mountShape1dNode(ctx, element);
      },
    });

    const node = harness.staticForegroundLayer.findOne((candidate: Konva.Node) => {
      return Shape1dPlugin.isShape1dNode(candidate) && candidate.id() === element.id;
    });
    if (!Shape1dPlugin.isShape1dNode(node)) throw new Error("Expected mounted shape1d node");

    const before = node.absolutePosition();
    dragNode(node, { dx: 45, dy: 25 });
    await flushCanvasEffects();

    expect(docHandle.doc().elements[element.id]?.x).toBeCloseTo(before.x + 45, 8);
    expect(docHandle.doc().elements[element.id]?.y).toBeCloseTo(before.y + 25, 8);

    context.history.undo();
    await flushCanvasEffects();
    expect(node.absolutePosition().x).toBeCloseTo(before.x, 8);
    expect(node.absolutePosition().y).toBeCloseTo(before.y, 8);

    context.history.redo();
    await flushCanvasEffects();
    expect(node.absolutePosition().x).toBeCloseTo(before.x + 45, 8);
    expect(node.absolutePosition().y).toBeCloseTo(before.y + 25, 8);

    harness.destroy();
  });

  test("alt-drag clone creates a persisted copy and clone history supports undo/redo", async () => {
    let context!: IPluginContext;
    const element = createShape1dElement({ type: "arrow" });
    const docHandle = createMockDocHandle({
      elements: {
        [element.id]: structuredClone(element),
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new Shape1dPlugin()],
      initializeScene(ctx) {
        context = ctx;
        mountShape1dNode(ctx, element);
      },
    });

    const sourceNode = harness.staticForegroundLayer.findOne((candidate: Konva.Node) => {
      return Shape1dPlugin.isShape1dNode(candidate) && candidate.id() === element.id;
    });
    if (!Shape1dPlugin.isShape1dNode(sourceNode)) throw new Error("Expected mounted shape1d node");

    sourceNode.fire("dragstart", {
      target: sourceNode,
      currentTarget: sourceNode,
      evt: new MouseEvent("dragstart", { bubbles: true, altKey: true }),
    });

    const cloneNode = harness.dynamicLayer.find((candidate: Konva.Node) => {
      return Shape1dPlugin.isShape1dNode(candidate) && candidate.id() !== sourceNode.id();
    })[0];
    if (!Shape1dPlugin.isShape1dNode(cloneNode)) throw new Error("Expected preview clone after alt-drag");

    cloneNode.setAbsolutePosition({
      x: sourceNode.absolutePosition().x + 70,
      y: sourceNode.absolutePosition().y + 30,
    });
    cloneNode.fire("dragend", {
      target: cloneNode,
      currentTarget: cloneNode,
      evt: new MouseEvent("dragend", { bubbles: true, altKey: true }),
    });
    await flushCanvasEffects();

    const persisted = Object.values(docHandle.doc().elements).filter((candidate) => candidate.data.type === "arrow");
    expect(persisted).toHaveLength(2);
    const cloneElement = persisted.find((candidate) => candidate.id !== element.id);
    expect(cloneElement).toBeTruthy();

    context.history.undo();
    await flushCanvasEffects();
    expect(Object.values(docHandle.doc().elements).filter((candidate) => candidate.data.type === "arrow")).toHaveLength(1);

    context.history.redo();
    await flushCanvasEffects();
    expect(Object.values(docHandle.doc().elements).filter((candidate) => candidate.data.type === "arrow")).toHaveLength(2);

    harness.destroy();
  });

  test("double-click enters point edit mode and dragging a point updates points with undo/redo", async () => {
    let context!: IPluginContext;
    const element = createShape1dElement({ type: "arrow", lineType: "curved" });
    const docHandle = createMockDocHandle({
      elements: {
        [element.id]: structuredClone(element),
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new SelectPlugin(), new Shape1dPlugin()],
      initializeScene(ctx) {
        context = ctx;
        const node = mountShape1dNode(ctx, element);
        ctx.setState("selection", [node]);
      },
    });

    const node = harness.staticForegroundLayer.findOne((candidate: Konva.Node) => Shape1dPlugin.isShape1dNode(candidate) && candidate.id() === element.id);
    if (!Shape1dPlugin.isShape1dNode(node)) throw new Error("Expected mounted shape1d node");

    node.fire("pointerdblclick", {
      target: node,
      currentTarget: node,
      evt: new PointerEvent("pointerdblclick", { bubbles: true }),
    });
    await flushCanvasEffects();

    expect(context.state.editingShape1dId).toBe(element.id);
    const anchorHandles = getAnchorHandles(harness.dynamicLayer);
    expect(anchorHandles.length).toBeGreaterThanOrEqual(3);

    const beforePoints = structuredClone((docHandle.doc().elements[element.id]?.data as TArrowData).points);
    dragHandle(context, anchorHandles[1]!, { x: 210, y: 230 });
    await flushCanvasEffects();

    const afterPoints = (docHandle.doc().elements[element.id]?.data as TArrowData).points;
    expect(afterPoints[1]).not.toEqual(beforePoints[1]);

    context.history.undo();
    await flushCanvasEffects();
    expect((docHandle.doc().elements[element.id]?.data as TArrowData).points).toEqual(beforePoints);

    context.history.redo();
    await flushCanvasEffects();
    expect((docHandle.doc().elements[element.id]?.data as TArrowData).points).toEqual(afterPoints);

    harness.destroy();
  });

  test("insert handle adds a new curve point with undo/redo", async () => {
    let context!: IPluginContext;
    const element = createShape1dElement({ type: "line", lineType: "curved", points: [[0, 0], [60, 20], [140, 10]] });
    const docHandle = createMockDocHandle({
      elements: {
        [element.id]: structuredClone(element),
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new SelectPlugin(), new Shape1dPlugin()],
      initializeScene(ctx) {
        context = ctx;
        const node = mountShape1dNode(ctx, element);
        ctx.setState("selection", [node]);
      },
    });

    const node = harness.staticForegroundLayer.findOne((candidate: Konva.Node) => Shape1dPlugin.isShape1dNode(candidate) && candidate.id() === element.id);
    if (!Shape1dPlugin.isShape1dNode(node)) throw new Error("Expected mounted shape1d node");

    node.fire("pointerdblclick", {
      target: node,
      currentTarget: node,
      evt: new PointerEvent("pointerdblclick", { bubbles: true }),
    });
    await flushCanvasEffects();

    const beforePoints = structuredClone((docHandle.doc().elements[element.id]?.data as TLineData).points);
    const insertHandle = getInsertHandles(harness.dynamicLayer)[0];
    expect(insertHandle).toBeTruthy();
    dragHandle(context, insertHandle!, { x: 220, y: 210 });
    await flushCanvasEffects();

    const afterPoints = (docHandle.doc().elements[element.id]?.data as TLineData).points;
    expect(afterPoints).toHaveLength(beforePoints.length + 1);

    context.history.undo();
    await flushCanvasEffects();
    expect((docHandle.doc().elements[element.id]?.data as TLineData).points).toEqual(beforePoints);

    context.history.redo();
    await flushCanvasEffects();
    expect((docHandle.doc().elements[element.id]?.data as TLineData).points).toEqual(afterPoints);

    harness.destroy();
  });

  test("line scene draws stroke without filling the line body", () => {
    const line = Shape1dPlugin.createShapeFromElement(createShape1dElement({
      type: "line",
      lineType: "curved",
      points: [[0, 0], [40, 90], [120, 20]],
    }));

    const sceneFunc = (line as any).sceneFunc();
    const calls: string[] = [];
    const fakeContext = {
      beginPath: () => calls.push("beginPath"),
      moveTo: () => calls.push("moveTo"),
      lineTo: () => calls.push("lineTo"),
      bezierCurveTo: () => calls.push("bezierCurveTo"),
      closePath: () => calls.push("closePath"),
      strokeShape: () => calls.push("strokeShape"),
      fillStrokeShape: () => calls.push("fillStrokeShape"),
    } as unknown as Konva.Context;

    sceneFunc(fakeContext, line);

    expect(calls).toContain("strokeShape");
    expect(calls).not.toContain("fillStrokeShape");
  });

  test("arrow scene fills only caps after stroking the line", () => {
    const arrow = Shape1dPlugin.createShapeFromElement(createShape1dElement({
      type: "arrow",
      lineType: "curved",
      points: [[0, 0], [40, 90], [120, 20]],
    }));

    const sceneFunc = (arrow as any).sceneFunc();
    const calls: string[] = [];
    const fakeContext = {
      beginPath: () => calls.push("beginPath"),
      moveTo: () => calls.push("moveTo"),
      lineTo: () => calls.push("lineTo"),
      bezierCurveTo: () => calls.push("bezierCurveTo"),
      closePath: () => calls.push("closePath"),
      arc: () => calls.push("arc"),
      strokeShape: () => calls.push("strokeShape"),
      fillStrokeShape: () => calls.push("fillStrokeShape"),
    } as unknown as Konva.Context;

    sceneFunc(fakeContext, arrow);

    expect(calls.filter((call) => call === "strokeShape")).toHaveLength(1);
    expect(calls.filter((call) => call === "fillStrokeShape")).toHaveLength(1);
  });

  test("point edit mode works for shape1d inside nested groups", async () => {
    let context!: IPluginContext;
    const element = createShape1dElement({ type: "line", lineType: "curved" });
    const docHandle = createMockDocHandle({
      elements: {
        [element.id]: structuredClone({ ...element, parentGroupId: "inner" }),
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new SelectPlugin(), new Shape1dPlugin()],
      initializeScene(ctx) {
        context = ctx;
        const outer = new Konva.Group({ id: "outer", x: 30, y: 20, rotation: 10 });
        const inner = new Konva.Group({ id: "inner", x: 40, y: 30, rotation: -8 });
        ctx.staticForegroundLayer.add(outer);
        outer.add(inner);
        const node = Shape1dPlugin.createShapeFromElement({ ...element, parentGroupId: "inner" });
        Shape1dPlugin.setupShapeListeners(ctx, node);
        node.draggable(false);
        inner.add(node);
        ctx.setState("selection", [outer, inner, node]);
      },
    });

    const node = harness.staticForegroundLayer.findOne((candidate: Konva.Node) => Shape1dPlugin.isShape1dNode(candidate) && candidate.id() === element.id);
    if (!Shape1dPlugin.isShape1dNode(node)) throw new Error("Expected mounted shape1d node");

    node.fire("pointerdblclick", {
      target: node,
      currentTarget: node,
      evt: new PointerEvent("pointerdblclick", { bubbles: true }),
    });
    await flushCanvasEffects();

    expect(context.state.editingShape1dId).toBe(element.id);
    const anchorHandle = getAnchorHandles(harness.dynamicLayer)[1];
    expect(anchorHandle).toBeTruthy();

    const beforeParentGroupId = docHandle.doc().elements[element.id]?.parentGroupId;
    dragHandle(context, anchorHandle!, { x: 260, y: 210 });
    await flushCanvasEffects();

    expect(docHandle.doc().elements[element.id]?.parentGroupId).toBe(beforeParentGroupId);
    expect((docHandle.doc().elements[element.id]?.data as TLineData).points[1]).toBeTruthy();

    harness.destroy();
  });

  test("single shape1d selection uses keepRatio and transformer resize serializes scaled points", async () => {
    let context!: IPluginContext;
    const element = createShape1dElement({ type: "line" });
    const docHandle = createMockDocHandle({
      elements: {
        [element.id]: structuredClone(element),
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new Shape1dPlugin(), new TransformPlugin()],
      initializeScene(ctx) {
        context = ctx;
        mountShape1dNode(ctx, element);
      },
    });

    const node = harness.staticForegroundLayer.findOne((candidate: Konva.Node) => {
      return Shape1dPlugin.isShape1dNode(candidate) && candidate.id() === element.id;
    });
    if (!Shape1dPlugin.isShape1dNode(node)) throw new Error("Expected mounted shape1d node");
    const transformer = harness.dynamicLayer.find((candidate: Konva.Node) => candidate instanceof Konva.Transformer)[0] as Konva.Transformer;

    context.setState("selection", [node]);
    await flushCanvasEffects();

    expect(transformer.keepRatio()).toBe(true);
    expect(transformer.enabledAnchors()).toEqual([
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
    ]);

    const originalPointX = (docHandle.doc().elements[element.id]?.data as TLineData).points[1]?.[0] ?? 0;
    transformer.fire("transformstart", {
      target: node,
      currentTarget: transformer,
      evt: new MouseEvent("transformstart", { bubbles: true }),
    });
    node.scaleX(1.8);
    node.scaleY(1.8);
    node.x(node.x() + 20);
    transformer.fire("transformend", {
      target: node,
      currentTarget: transformer,
      evt: new MouseEvent("transformend", { bubbles: true }),
    });
    await flushCanvasEffects();

    const resized = docHandle.doc().elements[element.id]?.data as TLineData;
    expect(resized.points[1]?.[0]).toBeGreaterThan(originalPointX);
    expect(node.scaleX()).toBeCloseTo(1, 8);
    expect(node.scaleY()).toBeCloseTo(1, 8);

    harness.destroy();
  });

  test("transform resize history restores and reapplies scaled line points", async () => {
    let context!: IPluginContext;
    const element = createShape1dElement({ type: "line" });
    const docHandle = createMockDocHandle({
      elements: {
        [element.id]: structuredClone(element),
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new Shape1dPlugin(), new TransformPlugin()],
      initializeScene(ctx) {
        context = ctx;
        mountShape1dNode(ctx, element);
      },
    });

    const node = harness.staticForegroundLayer.findOne((candidate: Konva.Node) => {
      return Shape1dPlugin.isShape1dNode(candidate) && candidate.id() === element.id;
    });
    if (!Shape1dPlugin.isShape1dNode(node)) throw new Error("Expected mounted shape1d node");
    const transformer = harness.dynamicLayer.find((candidate: Konva.Node) => candidate instanceof Konva.Transformer)[0] as Konva.Transformer;

    context.setState("selection", [node]);
    await flushCanvasEffects();

    const originalPoints = structuredClone((docHandle.doc().elements[element.id]?.data as TLineData).points);

    transformer.fire("transformstart", {
      target: node,
      currentTarget: transformer,
      evt: new MouseEvent("transformstart", { bubbles: true }),
    });
    node.scaleX(1.5);
    node.scaleY(1.5);
    transformer.fire("transformend", {
      target: node,
      currentTarget: transformer,
      evt: new MouseEvent("transformend", { bubbles: true }),
    });
    await flushCanvasEffects();

    const resizedPoints = structuredClone((docHandle.doc().elements[element.id]?.data as TLineData).points);
    expect(resizedPoints[1]?.[0]).toBeGreaterThan(originalPoints[1]?.[0] ?? 0);

    context.history.undo();
    await flushCanvasEffects();
    expect((docHandle.doc().elements[element.id]?.data as TLineData).points).toEqual(originalPoints);

    context.history.redo();
    await flushCanvasEffects();
    expect((docHandle.doc().elements[element.id]?.data as TLineData).points).toEqual(resizedPoints);

    harness.destroy();
  });

  test("transform rotate history restores and reapplies arrow rotation", async () => {
    let context!: IPluginContext;
    const element = createShape1dElement({ type: "arrow" });
    const docHandle = createMockDocHandle({
      elements: {
        [element.id]: structuredClone(element),
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new Shape1dPlugin(), new TransformPlugin()],
      initializeScene(ctx) {
        context = ctx;
        mountShape1dNode(ctx, element);
      },
    });

    const node = harness.staticForegroundLayer.findOne((candidate: Konva.Node) => {
      return Shape1dPlugin.isShape1dNode(candidate) && candidate.id() === element.id;
    });
    if (!Shape1dPlugin.isShape1dNode(node)) throw new Error("Expected mounted shape1d node");
    const transformer = harness.dynamicLayer.find((candidate: Konva.Node) => candidate instanceof Konva.Transformer)[0] as Konva.Transformer;

    context.setState("selection", [node]);
    await flushCanvasEffects();

    transformer.fire("transformstart", {
      target: node,
      currentTarget: transformer,
      evt: new MouseEvent("transformstart", { bubbles: true }),
    });
    node.rotation(35);
    transformer.fire("transformend", {
      target: node,
      currentTarget: transformer,
      evt: new MouseEvent("transformend", { bubbles: true }),
    });
    await flushCanvasEffects();

    expect(docHandle.doc().elements[element.id]?.rotation).toBeCloseTo(35, 8);

    context.history.undo();
    await flushCanvasEffects();
    expect(docHandle.doc().elements[element.id]?.rotation).toBeCloseTo(0, 8);

    context.history.redo();
    await flushCanvasEffects();
    expect(docHandle.doc().elements[element.id]?.rotation).toBeCloseTo(35, 8);

    harness.destroy();
  });
});
