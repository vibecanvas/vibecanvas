import Konva from "konva";
import { describe, expect, test, vi } from "vitest";
import { CustomEvents } from "../../../src/custom-events";
import { PenPlugin } from "../../../src/plugins/Pen.plugin";
import { SceneHydratorPlugin } from "../../../src/plugins/SceneHydrator.plugin";
import { Shape2dPlugin } from "../../../src/plugins/Shape2d.plugin";
import type { IPluginContext } from "../../../src/plugins/interface";
import { TransformPlugin } from "../../../src/plugins/Transform.plugin";
import { CanvasMode } from "../../../src/services/canvas/enum";
import { createPenDataFromStrokePoints, type TStrokePoint } from "../../../src/plugins/pen.math";
import { createCanvasTestHarness, createMockDocHandle, flushCanvasEffects } from "../../test-setup";
import type { TElement, TPenData } from "@vibecanvas/shell/automerge/index";

function createPenElement(args?: {
  id?: string;
  rotation?: number;
  points?: TStrokePoint[];
}) {
  const strokePoints = args?.points ?? [
    { x: 120, y: 80, pressure: 0.5 },
    { x: 150, y: 100, pressure: 0.55 },
    { x: 185, y: 110, pressure: 0.6 },
    { x: 220, y: 135, pressure: 0.5 },
  ];
  const penData = createPenDataFromStrokePoints(strokePoints);
  if (!penData) throw new Error("Failed to create pen data for test");

  return {
    id: args?.id ?? "pen-1",
    x: penData.x,
    y: penData.y,
    rotation: args?.rotation ?? 0,
    bindings: [],
    createdAt: 1,
    updatedAt: 1,
    locked: false,
    parentGroupId: null,
    zIndex: "",
    style: {
      backgroundColor: "#0f172a",
      opacity: 0.92,
      strokeWidth: 7,
    },
    data: {
      type: "pen",
      points: penData.points,
      pressures: penData.pressures,
      simulatePressure: penData.simulatePressure,
    },
  } satisfies TElement;
}

function createPointerEvent(type: string, pressure = 0.5) {
  return {
    evt: new PointerEvent(type, { pressure }),
  } as Konva.KonvaEventObject<PointerEvent>;
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

function mountPenNode(context: IPluginContext, element: TElement) {
  const node = context.capabilities.createShapeFromTElement?.(element);
  if (!(node instanceof Konva.Path)) {
    throw new Error("Expected PenPlugin to create a Konva.Path");
  }

  context.staticForegroundLayer.add(node);
  return node;
}

function getPersistedPenElement(docHandle: ReturnType<typeof createMockDocHandle>, id: string) {
  const element = docHandle.doc().elements[id];
  if (!element || element.data.type !== "pen") {
    throw new Error(`Expected persisted pen element '${id}'`);
  }

  return element as TElement & { data: TPenData };
}

function dragNode(node: Konva.Path, args: { dx: number; dy: number; altKey?: boolean }) {
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

function altDragPen(node: Konva.Path, args: { dx: number; dy: number }) {
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
    .find((child) => !beforeNodeIds.has(child._id) && child instanceof Konva.Path) as Konva.Path | undefined;

  if (!previewClone) {
    throw new Error("Expected preview clone after alt-drag start");
  }

  const before = previewClone.absolutePosition();
  previewClone.setAbsolutePosition({ x: before.x + args.dx, y: before.y + args.dy });
  previewClone.fire("dragend", {
    target: previewClone,
    currentTarget: previewClone,
    evt: new MouseEvent("dragend", { bubbles: true, altKey: true }),
  });
}

describe("PenPlugin", () => {
  test("Escape cancels an in-progress pen preview before pointerup", async () => {
    let context!: IPluginContext;
    const docHandle = createMockDocHandle();

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new PenPlugin()],
      initializeScene(ctx) {
        context = ctx;
      },
    });

    context.setState("mode", CanvasMode.DRAW_CREATE);
    context.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "pen");

    withDynamicPointer(context, { x: 120, y: 80 }, () => {
      context.hooks.pointerDown.call(createPointerEvent("pointerdown", 0.4));
    });
    withDynamicPointer(context, { x: 180, y: 120 }, () => {
      context.hooks.pointerMove.call(createPointerEvent("pointermove", 0.6) as Konva.KonvaEventObject<MouseEvent>);
    });

    expect(harness.dynamicLayer.find((node: Konva.Node) => node instanceof Konva.Path)).toHaveLength(1);

    fireKeydown(context, "Escape");
    context.hooks.pointerUp.call(createPointerEvent("pointerup", 0.5));
    await flushCanvasEffects();

    expect(harness.dynamicLayer.find((node: Konva.Node) => node instanceof Konva.Path)).toHaveLength(0);
    expect(harness.staticForegroundLayer.find((node: Konva.Node) => node instanceof Konva.Path)).toHaveLength(0);
    expect(Object.keys(docHandle.doc().elements)).toHaveLength(0);
    expect(context.state.mode).toBe(CanvasMode.SELECT);

    harness.destroy();
  });

  test("draw-create commits a pen path to scene and CRDT", async () => {
    let context!: IPluginContext;
    const docHandle = createMockDocHandle();

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new PenPlugin()],
      initializeScene(ctx) {
        context = ctx;
      },
    });

    context.setState("mode", CanvasMode.DRAW_CREATE);
    context.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "pen");

    withDynamicPointer(context, { x: 120, y: 80 }, () => {
      context.hooks.pointerDown.call(createPointerEvent("pointerdown", 0.4));
    });
    withDynamicPointer(context, { x: 160, y: 110 }, () => {
      context.hooks.pointerMove.call(createPointerEvent("pointermove", 0.6) as Konva.KonvaEventObject<MouseEvent>);
    });
    withDynamicPointer(context, { x: 210, y: 140 }, () => {
      context.hooks.pointerMove.call(createPointerEvent("pointermove", 0.5) as Konva.KonvaEventObject<MouseEvent>);
    });

    const previewPath = harness.dynamicLayer.find((node: Konva.Node) => node instanceof Konva.Path)[0] as Konva.Path | undefined;
    expect(previewPath).toBeInstanceOf(Konva.Path);

    context.hooks.pointerUp.call(createPointerEvent("pointerup", 0.5));

    await flushCanvasEffects();

    const penNodes = harness.staticForegroundLayer.find((node: Konva.Node) => node instanceof Konva.Path) as Konva.Path[];
    expect(penNodes).toHaveLength(1);
    expect(context.state.mode).toBe(CanvasMode.SELECT);

    const docElements = Object.values(docHandle.doc().elements);
    expect(docElements).toHaveLength(1);
    expect(docElements[0]?.data.type).toBe("pen");
    if (docElements[0]?.data.type !== "pen") {
      throw new Error("Expected created document element to be a pen");
    }
    expect(docElements[0].data.points.length).toBeGreaterThanOrEqual(3);

    const visiblePreviewPaths = harness.dynamicLayer.find((node: Konva.Node) => {
      return node instanceof Konva.Path && node.visible();
    });
    expect(visiblePreviewPaths).toHaveLength(0);

    const createdNode = penNodes[0];
    expect(createdNode?.getLayer()).toBe(harness.staticForegroundLayer);
    expect(createdNode?.visible()).toBe(true);
    expect(createdNode?.id()).toBe(previewPath?.id());
    expect(harness.dynamicLayer.find((node: Konva.Node) => node instanceof Konva.Path)).toHaveLength(0);

    harness.destroy();
  });

  test("pen pointerUp is not intercepted by Shape2dPlugin draw-create handler", async () => {
    let context!: IPluginContext;
    const docHandle = createMockDocHandle();

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new Shape2dPlugin(), new PenPlugin()],
      initializeScene(ctx) {
        context = ctx;
      },
    });

    context.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "pen");
    context.setState("mode", CanvasMode.DRAW_CREATE);

    withDynamicPointer(context, { x: 120, y: 80 }, () => {
      context.hooks.pointerDown.call(createPointerEvent("pointerdown", 0.4));
    });
    withDynamicPointer(context, { x: 160, y: 110 }, () => {
      context.hooks.pointerMove.call(createPointerEvent("pointermove", 0.6) as Konva.KonvaEventObject<MouseEvent>);
    });
    context.hooks.pointerUp.call(createPointerEvent("pointerup", 0.5));
    await flushCanvasEffects();

    const docElements = Object.values(docHandle.doc().elements);
    expect(docElements).toHaveLength(1);
    expect(docElements[0]?.data.type).toBe("pen");
    expect(context.state.mode).toBe(CanvasMode.SELECT);

    harness.destroy();
  });

  test("single pen selection uses corner-only transformer anchors with keepRatio", async () => {
    let context!: IPluginContext;
    const element = createPenElement();

    const harness = await createCanvasTestHarness({
      plugins: [new PenPlugin(), new TransformPlugin()],
      initializeScene(ctx) {
        context = ctx;
        mountPenNode(ctx, element);
      },
    });

    const node = harness.staticForegroundLayer.findOne<Konva.Path>(`#${element.id}`)!;
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

    harness.destroy();
  });

  test("SceneHydratorPlugin mounts persisted pen elements", async () => {
    const element = createPenElement();
    const docHandle = createMockDocHandle({
      elements: {
        [element.id]: element,
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new PenPlugin(), new SceneHydratorPlugin()],
    });

    const node = harness.staticForegroundLayer.findOne<Konva.Path>(`#${element.id}`);
    expect(node).toBeInstanceOf(Konva.Path);
    expect(node?.data().length).toBeGreaterThan(0);
    expect(node?.fill()).toBe(element.style.backgroundColor);

    harness.destroy();
  });

  test("drag updates pen position in CRDT and history undo/redo", async () => {
    let context!: IPluginContext;
    const element = createPenElement();
    const docHandle = createMockDocHandle({
      elements: {
        [element.id]: structuredClone(element),
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new PenPlugin()],
      initializeScene(ctx) {
        context = ctx;
        mountPenNode(ctx, element);
      },
    });

    const node = harness.staticForegroundLayer.findOne<Konva.Path>(`#${element.id}`)!;
    const before = node.absolutePosition();

    dragNode(node, { dx: 45, dy: 20 });
    await flushCanvasEffects();

    expect(node.absolutePosition().x).toBeCloseTo(before.x + 45, 8);
    expect(node.absolutePosition().y).toBeCloseTo(before.y + 20, 8);
    expect(docHandle.doc().elements[element.id]?.x).toBeCloseTo(before.x + 45, 8);
    expect(docHandle.doc().elements[element.id]?.y).toBeCloseTo(before.y + 20, 8);

    context.history.undo();
    await flushCanvasEffects();
    expect(node.absolutePosition().x).toBeCloseTo(before.x, 8);
    expect(node.absolutePosition().y).toBeCloseTo(before.y, 8);

    context.history.redo();
    await flushCanvasEffects();
    expect(node.absolutePosition().x).toBeCloseTo(before.x + 45, 8);
    expect(node.absolutePosition().y).toBeCloseTo(before.y + 20, 8);

    harness.destroy();
  });

  test("alt-drag clone creates a second persisted pen element", async () => {
    let context!: IPluginContext;
    const element = createPenElement();
    const docHandle = createMockDocHandle({
      elements: {
        [element.id]: structuredClone(element),
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new PenPlugin()],
      initializeScene(ctx) {
        context = ctx;
        mountPenNode(ctx, element);
      },
    });

    const sourceNode = harness.staticForegroundLayer.findOne<Konva.Path>(`#${element.id}`)!;
    sourceNode.fire("dragstart", {
      target: sourceNode,
      currentTarget: sourceNode,
      evt: new MouseEvent("dragstart", { bubbles: true, altKey: true }),
    });

    const cloneNode = harness.dynamicLayer.find((node: Konva.Node) => {
      return node instanceof Konva.Path && node.id() !== sourceNode.id();
    })[0] as Konva.Path | undefined;

    expect(cloneNode).toBeInstanceOf(Konva.Path);
    cloneNode!.setAbsolutePosition({ x: sourceNode.absolutePosition().x + 70, y: sourceNode.absolutePosition().y + 30 });
    cloneNode!.fire("dragend", {
      target: cloneNode,
      currentTarget: cloneNode,
      evt: new MouseEvent("dragend", { bubbles: true, altKey: true }),
    });
    await flushCanvasEffects();

    const persistedPenElements = Object.values(docHandle.doc().elements).filter((candidate) => candidate.data.type === "pen");
    expect(persistedPenElements).toHaveLength(2);

    const createdClone = persistedPenElements.find((candidate) => candidate.id !== element.id);
    expect(createdClone).toBeTruthy();
    if (!createdClone || createdClone.data.type !== "pen") {
      throw new Error("Expected cloned document element to be a pen");
    }
    expect(createdClone.data.points).toEqual(element.data.points);
    expect(createdClone.data.pressures).toEqual(element.data.pressures);
    expect(context.state.selection[0]?.id()).toBe(createdClone?.id);

    harness.destroy();
  });

  test("alt-dragging one pen in a top-level multi-selection should clone both selected pens", async () => {
    let context!: IPluginContext;
    const elementA = createPenElement({ id: "pen-a" });
    const elementB = createPenElement({ id: "pen-b", points: [
      { x: 320, y: 180, pressure: 0.5 },
      { x: 350, y: 200, pressure: 0.55 },
      { x: 385, y: 210, pressure: 0.6 },
      { x: 420, y: 235, pressure: 0.5 },
    ] });
    const docHandle = createMockDocHandle({
      elements: {
        [elementA.id]: structuredClone(elementA),
        [elementB.id]: structuredClone(elementB),
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new PenPlugin()],
      initializeScene(ctx) {
        context = ctx;
        mountPenNode(ctx, elementA);
        mountPenNode(ctx, elementB);
      },
    });

    const penA = harness.staticForegroundLayer.findOne<Konva.Path>("#pen-a")!;
    const penB = harness.staticForegroundLayer.findOne<Konva.Path>("#pen-b")!;
    context.setState("selection", [penA, penB]);
    await flushCanvasEffects();

    altDragPen(penB, { dx: 70, dy: 30 });
    await flushCanvasEffects();

    const persistedPenElements = Object.values(docHandle.doc().elements).filter((candidate) => candidate.data.type === "pen");
    expect(persistedPenElements).toHaveLength(4);

    harness.destroy();
  });

  test("shared transformer resize bakes scale into pen points and resets node scale", async () => {
    let context!: IPluginContext;
    const element = createPenElement();
    const docHandle = createMockDocHandle({
      elements: {
        [element.id]: structuredClone(element),
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new PenPlugin(), new TransformPlugin()],
      initializeScene(ctx) {
        context = ctx;
        mountPenNode(ctx, element);
      },
    });

    const node = harness.staticForegroundLayer.findOne<Konva.Path>(`#${element.id}`)!;
    const transformer = harness.dynamicLayer.find((candidate: Konva.Node) => candidate instanceof Konva.Transformer)[0] as Konva.Transformer;
    const originalPoints = structuredClone(getPersistedPenElement(docHandle, element.id).data.points);

    context.setState("selection", [node]);
    await flushCanvasEffects();

    transformer.fire("transformstart", {
      target: node,
      currentTarget: transformer,
      evt: new MouseEvent("transformstart", { bubbles: true }),
    });
    node.scaleX(1.8);
    node.scaleY(1.4);
    node.x(node.x() + 25);
    node.y(node.y() + 10);
    transformer.fire("transformend", {
      target: node,
      currentTarget: transformer,
      evt: new MouseEvent("transformend", { bubbles: true }),
    });
    await flushCanvasEffects();

    const resizedElement = getPersistedPenElement(docHandle, element.id);
    expect(resizedElement.data.points[1]?.[0]).toBeGreaterThan(originalPoints[1]?.[0] ?? 0);
    expect(resizedElement.data.points[1]?.[1]).toBeGreaterThan(originalPoints[1]?.[1] ?? 0);
    expect(node.scaleX()).toBeCloseTo(1, 8);
    expect(node.scaleY()).toBeCloseTo(1, 8);

    context.history.undo();
    await flushCanvasEffects();
    expect(getPersistedPenElement(docHandle, element.id).data.points).toEqual(originalPoints);

    context.history.redo();
    await flushCanvasEffects();
    expect(getPersistedPenElement(docHandle, element.id).data.points[1]?.[0]).toBeGreaterThan(originalPoints[1]?.[0] ?? 0);

    harness.destroy();
  });

  test("shared transformer rotate persists rotation and supports undo/redo", async () => {
    let context!: IPluginContext;
    const element = createPenElement();
    const docHandle = createMockDocHandle({
      elements: {
        [element.id]: structuredClone(element),
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new PenPlugin(), new TransformPlugin()],
      initializeScene(ctx) {
        context = ctx;
        mountPenNode(ctx, element);
      },
    });

    const node = harness.staticForegroundLayer.findOne<Konva.Path>(`#${element.id}`)!;
    const transformer = harness.dynamicLayer.find((candidate: Konva.Node) => candidate instanceof Konva.Transformer)[0] as Konva.Transformer;

    context.setState("selection", [node]);
    await flushCanvasEffects();

    transformer.fire("transformstart", {
      target: node,
      currentTarget: transformer,
      evt: new MouseEvent("transformstart", { bubbles: true }),
    });
    node.rotation(33);
    transformer.fire("transformend", {
      target: node,
      currentTarget: transformer,
      evt: new MouseEvent("transformend", { bubbles: true }),
    });
    await flushCanvasEffects();

    expect(docHandle.doc().elements[element.id]!.rotation).toBeCloseTo(33, 8);

    context.history.undo();
    await flushCanvasEffects();
    expect(docHandle.doc().elements[element.id]!.rotation).toBeCloseTo(0, 8);

    context.history.redo();
    await flushCanvasEffects();
    expect(docHandle.doc().elements[element.id]!.rotation).toBeCloseTo(33, 8);

    harness.destroy();
  });

  test("dragmove throttles CRDT patches for pen drags", async () => {
    vi.useFakeTimers();
    let context!: IPluginContext;
    const element = createPenElement();

    try {
      const harness = await createCanvasTestHarness({
        plugins: [new PenPlugin()],
        initializeScene(ctx) {
          context = ctx;
          mountPenNode(ctx, element);
        },
      });

      const node = harness.staticForegroundLayer.findOne<Konva.Path>(`#${element.id}`)!;
      const patchSpy = vi.spyOn(context.crdt, "patch");

      node.fire("dragstart", {
        target: node,
        currentTarget: node,
        evt: new MouseEvent("dragstart", { bubbles: true }),
      });

      for (let index = 1; index <= 12; index += 1) {
        node.setAbsolutePosition({
          x: element.x + index * 5,
          y: element.y + index * 2,
        });
        node.fire("dragmove", {
          target: node,
          currentTarget: node,
          evt: new MouseEvent("dragmove", { bubbles: true }),
        });
      }

      expect(patchSpy.mock.calls.length).toBeLessThan(12);

      vi.runAllTimers();
      node.fire("dragend", {
        target: node,
        currentTarget: node,
        evt: new MouseEvent("dragend", { bubbles: true }),
      });
      await flushCanvasEffects();

      expect(patchSpy.mock.calls.length).toBeLessThanOrEqual(4);

      harness.destroy();
    } finally {
      vi.useRealTimers();
    }
  });
});
