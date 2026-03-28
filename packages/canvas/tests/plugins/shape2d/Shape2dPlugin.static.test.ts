import Konva from "konva";
import { describe, expect, test } from "vitest";
import { Shape2dPlugin } from "../../../src/plugins/Shape2d.plugin";
import { CustomEvents } from "../../../src/custom-events";
import { CanvasMode } from "../../../src/services/canvas/enum";
import type { IPluginContext } from "../../../src/plugins/interface";
import { createCanvasTestHarness, createMockDocHandle, flushCanvasEffects } from "../../test-setup";

function createStageHost() {
  const container = document.createElement("div");
  const stage = new Konva.Stage({ width: 800, height: 600, container });
  const layer = new Konva.Layer();
  stage.add(layer);
  return { stage, layer };
}

function createPointerEvent(type: string, args?: { shiftKey?: boolean }) {
  return { evt: new PointerEvent(type, { shiftKey: args?.shiftKey }) } as Konva.KonvaEventObject<PointerEvent>;
}

function createMouseMoveEvent(args?: { shiftKey?: boolean }) {
  return { evt: new MouseEvent("pointermove", { shiftKey: args?.shiftKey }) } as Konva.KonvaEventObject<MouseEvent>;
}

function withDynamicPointer(context: IPluginContext, point: { x: number; y: number }, callback: () => void) {
  const original = context.dynamicLayer.getRelativePointerPosition.bind(context.dynamicLayer);
  context.dynamicLayer.getRelativePointerPosition = () => point;
  callback();
  context.dynamicLayer.getRelativePointerPosition = original;
}

describe("Shape2dPlugin static helpers", () => {
  test("serializes diamond using top-left bounds", () => {
    const diamond = Shape2dPlugin.createDiamondFromElement({
      id: "diamond-1",
      x: 150,
      y: 250,
      rotation: 20,
      bindings: [],
      createdAt: 1,
      locked: false,
      parentGroupId: null,
      updatedAt: 1,
      zIndex: "",
      data: { type: "diamond", w: 160, h: 120 },
      style: { backgroundColor: "blue", strokeColor: "black", strokeWidth: 2, opacity: 0.8 },
    });
    const { stage, layer } = createStageHost();
    layer.add(diamond);

    const element = Shape2dPlugin.toTElement(diamond);

    expect(element.data.type).toBe("diamond");
    expect(element.x).toBeCloseTo(150, 8);
    expect(element.y).toBeCloseTo(250, 8);
    expect(element.rotation).toBeCloseTo(20, 8);
    expect(element.data.w).toBeCloseTo(160, 8);
    expect(element.data.h).toBeCloseTo(120, 8);

    stage.destroy();
  });

  test("serializes ellipse using top-left bounds and radii", () => {
    const ellipse = Shape2dPlugin.createEllipseFromElement({
      id: "ellipse-1",
      x: 200,
      y: 300,
      rotation: 30,
      bindings: [],
      createdAt: 1,
      locked: false,
      parentGroupId: null,
      updatedAt: 1,
      zIndex: "",
      data: { type: "ellipse", rx: 100, ry: 60 },
      style: { backgroundColor: "green", strokeColor: "black", strokeWidth: 3, opacity: 0.7 },
    });
    const { stage, layer } = createStageHost();
    layer.add(ellipse);

    const element = Shape2dPlugin.toTElement(ellipse);

    expect(element.data.type).toBe("ellipse");
    expect(element.x).toBeCloseTo(200, 8);
    expect(element.y).toBeCloseTo(300, 8);
    expect(element.rotation).toBeCloseTo(30, 8);
    expect(element.data.rx).toBeCloseTo(100, 8);
    expect(element.data.ry).toBeCloseTo(60, 8);

    stage.destroy();
  });

  test("clones diamond and ellipse with new ids", () => {
    const diamond = Shape2dPlugin.createDiamondFromElement({
      id: "diamond-source",
      x: 80,
      y: 90,
      rotation: 15,
      bindings: [],
      createdAt: 1,
      locked: false,
      parentGroupId: null,
      updatedAt: 1,
      zIndex: "",
      data: { type: "diamond", w: 100, h: 70 },
      style: { backgroundColor: "#f00" },
    });
    const ellipse = Shape2dPlugin.createEllipseFromElement({
      id: "ellipse-source",
      x: 120,
      y: 140,
      rotation: 25,
      bindings: [],
      createdAt: 1,
      locked: false,
      parentGroupId: null,
      updatedAt: 1,
      zIndex: "",
      data: { type: "ellipse", rx: 50, ry: 30 },
      style: { backgroundColor: "#0f0" },
    });
    const { stage, layer } = createStageHost();
    layer.add(diamond);
    layer.add(ellipse);

    const clonedDiamond = Shape2dPlugin.createShapeFromNode(diamond)!;
    const clonedEllipse = Shape2dPlugin.createShapeFromNode(ellipse)!;
    const clonedDiamondElement = Shape2dPlugin.toTElement(clonedDiamond);
    const clonedEllipseElement = Shape2dPlugin.toTElement(clonedEllipse);

    expect(clonedDiamond.id()).not.toBe(diamond.id());
    expect(clonedDiamondElement.data.type).toBe("diamond");
    expect(clonedDiamondElement.x).toBeCloseTo(80, 8);
    expect(clonedDiamondElement.y).toBeCloseTo(90, 8);
    expect(clonedDiamondElement.data.w).toBeCloseTo(100, 8);
    expect(clonedDiamondElement.data.h).toBeCloseTo(70, 8);

    expect(clonedEllipse.id()).not.toBe(ellipse.id());
    expect(clonedEllipseElement.data.type).toBe("ellipse");
    expect(clonedEllipseElement.x).toBeCloseTo(120, 8);
    expect(clonedEllipseElement.y).toBeCloseTo(140, 8);
    expect(clonedEllipseElement.data.rx).toBeCloseTo(50, 8);
    expect(clonedEllipseElement.data.ry).toBeCloseTo(30, 8);

    stage.destroy();
  });
});

describe("Shape2dPlugin draw-create", () => {
  test("draws and persists a diamond", async () => {
    let context!: IPluginContext;
    const docHandle = createMockDocHandle();

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new Shape2dPlugin()],
      initializeScene(ctx) {
        context = ctx;
      },
    });

    context.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "diamond");
    context.setState("mode", CanvasMode.DRAW_CREATE);

    withDynamicPointer(context, { x: 120, y: 140 }, () => {
      context.hooks.pointerDown.call(createPointerEvent("pointerdown"));
    });
    withDynamicPointer(context, { x: 260, y: 240 }, () => {
      context.hooks.pointerMove.call(createMouseMoveEvent());
    });
    context.hooks.pointerUp.call(createPointerEvent("pointerup"));
    await flushCanvasEffects();

    const shape = harness.staticForegroundLayer.findOne((node: Konva.Node) => Shape2dPlugin.isDiamondNode(node));
    expect(shape).toBeTruthy();

    const [element] = Object.values(docHandle.doc().elements);
    expect(element?.data.type).toBe("diamond");
    expect((element?.data as any).w).toBeCloseTo(140, 8);
    expect((element?.data as any).h).toBeCloseTo(100, 8);
    expect(element?.x).toBeCloseTo(120, 8);
    expect(element?.y).toBeCloseTo(140, 8);

    harness.destroy();
  });

  test("shift-drawing a rectangle preserves a square ratio", async () => {
    let context!: IPluginContext;
    const docHandle = createMockDocHandle();

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new Shape2dPlugin()],
      initializeScene(ctx) {
        context = ctx;
      },
    });

    context.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "rectangle");
    context.setState("mode", CanvasMode.DRAW_CREATE);

    withDynamicPointer(context, { x: 100, y: 100 }, () => {
      context.hooks.pointerDown.call(createPointerEvent("pointerdown"));
    });
    withDynamicPointer(context, { x: 220, y: 160 }, () => {
      context.hooks.pointerMove.call(createMouseMoveEvent({ shiftKey: true }));
    });
    context.hooks.pointerUp.call(createPointerEvent("pointerup"));
    await flushCanvasEffects();

    const [element] = Object.values(docHandle.doc().elements);
    expect(element?.data.type).toBe("rect");
    expect((element?.data as any).w).toBeCloseTo(120, 8);
    expect((element?.data as any).h).toBeCloseTo(120, 8);

    harness.destroy();
  });

  test("shift-drawing a diamond preserves equal width and height", async () => {
    let context!: IPluginContext;
    const docHandle = createMockDocHandle();

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new Shape2dPlugin()],
      initializeScene(ctx) {
        context = ctx;
      },
    });

    context.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "diamond");
    context.setState("mode", CanvasMode.DRAW_CREATE);

    withDynamicPointer(context, { x: 160, y: 120 }, () => {
      context.hooks.pointerDown.call(createPointerEvent("pointerdown"));
    });
    withDynamicPointer(context, { x: 250, y: 180 }, () => {
      context.hooks.pointerMove.call(createMouseMoveEvent({ shiftKey: true }));
    });
    context.hooks.pointerUp.call(createPointerEvent("pointerup"));
    await flushCanvasEffects();

    const [element] = Object.values(docHandle.doc().elements);
    expect(element?.data.type).toBe("diamond");
    expect((element?.data as any).w).toBeCloseTo(90, 8);
    expect((element?.data as any).h).toBeCloseTo(90, 8);

    harness.destroy();
  });

  test("draws and persists an ellipse", async () => {
    let context!: IPluginContext;
    const docHandle = createMockDocHandle();

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new Shape2dPlugin()],
      initializeScene(ctx) {
        context = ctx;
      },
    });

    context.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "ellipse");
    context.setState("mode", CanvasMode.DRAW_CREATE);

    withDynamicPointer(context, { x: 300, y: 200 }, () => {
      context.hooks.pointerDown.call(createPointerEvent("pointerdown"));
    });
    withDynamicPointer(context, { x: 420, y: 280 }, () => {
      context.hooks.pointerMove.call(createMouseMoveEvent());
    });
    context.hooks.pointerUp.call(createPointerEvent("pointerup"));
    await flushCanvasEffects();

    const shape = harness.staticForegroundLayer.findOne<Konva.Ellipse>((node: Konva.Node) => node instanceof Konva.Ellipse);
    expect(shape).toBeTruthy();

    const [element] = Object.values(docHandle.doc().elements);
    expect(element?.data.type).toBe("ellipse");
    expect((element?.data as any).rx).toBeCloseTo(60, 8);
    expect((element?.data as any).ry).toBeCloseTo(40, 8);
    expect(element?.x).toBeCloseTo(300, 8);
    expect(element?.y).toBeCloseTo(200, 8);

    harness.destroy();
  });

  test("shift-drawing an ellipse preserves a circle ratio", async () => {
    let context!: IPluginContext;
    const docHandle = createMockDocHandle();

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new Shape2dPlugin()],
      initializeScene(ctx) {
        context = ctx;
      },
    });

    context.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "ellipse");
    context.setState("mode", CanvasMode.DRAW_CREATE);

    withDynamicPointer(context, { x: 300, y: 220 }, () => {
      context.hooks.pointerDown.call(createPointerEvent("pointerdown"));
    });
    withDynamicPointer(context, { x: 420, y: 280 }, () => {
      context.hooks.pointerMove.call(createMouseMoveEvent({ shiftKey: true }));
    });
    context.hooks.pointerUp.call(createPointerEvent("pointerup"));
    await flushCanvasEffects();

    const [element] = Object.values(docHandle.doc().elements);
    expect(element?.data.type).toBe("ellipse");
    expect((element?.data as any).rx).toBeCloseTo(60, 8);
    expect((element?.data as any).ry).toBeCloseTo(60, 8);

    harness.destroy();
  });
});
