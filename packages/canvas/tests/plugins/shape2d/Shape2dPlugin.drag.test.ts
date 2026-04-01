import Konva from "konva";
import { describe, expect, test } from "vitest";
import { CustomEvents } from "../../../src/custom-events";
import { GroupPlugin, Shape2dPlugin, type IPluginContext } from "../../../src/plugins";
import { CanvasMode } from "../../../src/services/canvas/enum";
import { initializeScene03TopLevelMixedSelection } from "../../scenarios/03-top-level-mixed-selection";
import { createCanvasTestHarness, createMockDocHandle, exportStageSnapshot, flushCanvasEffects } from "../../test-setup";

async function createShapeSceneHarness() {
  let pluginContext!: IPluginContext;
  const groupPlugin = new GroupPlugin();

  const harness = await createCanvasTestHarness({
    plugins: [new Shape2dPlugin(), groupPlugin],
    initializeScene: (context) => {
      pluginContext = context;
      initializeScene03TopLevelMixedSelection({
        context,
        groupPlugin,
      });
    },
  });

  const s4 = harness.staticForegroundLayer.findOne<Konva.Rect>("#4");

  expect(s4).toBeTruthy();

  pluginContext.history.clear();

  return {
    harness,
    pluginContext,
    s4: s4!,
  };
}

function dragShapeInScreenSpace(shape: Konva.Shape, args: { deltaX: number; deltaY?: number }) {
  const beforeAbsolutePosition = shape.absolutePosition();

  shape.fire("dragstart", {
    target: shape,
    currentTarget: shape,
    evt: new MouseEvent("dragstart", { bubbles: true }),
  });

  shape.setAbsolutePosition({
    x: beforeAbsolutePosition.x + args.deltaX,
    y: beforeAbsolutePosition.y + (args.deltaY ?? 0),
  });

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

function withDynamicPointer(context: IPluginContext, point: { x: number; y: number }, callback: () => void) {
  const original = context.dynamicLayer.getRelativePointerPosition.bind(context.dynamicLayer);
  context.dynamicLayer.getRelativePointerPosition = () => point;
  callback();
  context.dynamicLayer.getRelativePointerPosition = original;
}

function fireKeydown(context: IPluginContext, key: string) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  Object.defineProperty(event, "target", { configurable: true, value: context.stage.container() });
  context.hooks.keydown.call(event);
}

function altDragShape(shape: Konva.Shape, args: { deltaX: number; deltaY?: number }) {
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
    throw new Error("Expected preview clone after alt-drag start");
  }

  const beforeAbsolutePosition = previewClone.absolutePosition();
  previewClone.setAbsolutePosition({
    x: beforeAbsolutePosition.x + args.deltaX,
    y: beforeAbsolutePosition.y + (args.deltaY ?? 0),
  });

  previewClone.fire("dragend", {
    target: previewClone,
    currentTarget: previewClone,
    evt: new MouseEvent("dragend", { bubbles: true, altKey: true }),
  });
}

function expectShapePosition(shape: Konva.Shape, args: {
  absoluteX: number;
  absoluteY: number;
  localX: number;
  localY: number;
}) {
  expect(shape.absolutePosition().x).toBeCloseTo(args.absoluteX, 8);
  expect(shape.absolutePosition().y).toBeCloseTo(args.absoluteY, 8);
  expect(shape.x()).toBeCloseTo(args.localX, 8);
  expect(shape.y()).toBeCloseTo(args.localY, 8);
}


describe("Shape2dPlugin", () => {
  test("Escape cancels an in-progress rectangle preview before pointerup", async () => {
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

    withDynamicPointer(context, { x: 120, y: 140 }, () => {
      context.hooks.pointerDown.call(createPointerEvent("pointerdown"));
    });
    withDynamicPointer(context, { x: 260, y: 240 }, () => {
      context.hooks.pointerMove.call(createMouseMoveEvent());
    });

    expect(harness.dynamicLayer.find((node: Konva.Node) => node instanceof Konva.Rect)).toHaveLength(1);

    fireKeydown(context, "Escape");
    context.hooks.pointerUp.call(createPointerEvent("pointerup"));
    await flushCanvasEffects();

    expect(harness.dynamicLayer.find((node: Konva.Node) => node instanceof Konva.Rect)).toHaveLength(0);
    expect(harness.staticForegroundLayer.find((node: Konva.Node) => node instanceof Konva.Rect)).toHaveLength(0);
    expect(Object.keys(docHandle.doc().elements)).toHaveLength(0);
    expect(context.state.mode).toBe(CanvasMode.SELECT);

    harness.destroy();
  });

  test("scene3: dragging top-level s4 to the right without camera change updates its position and drag history", async () => {
    const { harness, pluginContext, s4 } = await createShapeSceneHarness();
    const snapshotDir = "tests/artifacts/shape2d-plugin/scene3-s4-drag-no-camera";
    const beforeAbsolutePosition = s4.absolutePosition();
    const beforeWorldX = s4.x();
    const beforeWorldY = s4.y();
    const draggedAbsoluteX = beforeAbsolutePosition.x + 90;
    const draggedAbsoluteY = beforeAbsolutePosition.y;
    const draggedWorldX = beforeWorldX + 90;
    const draggedWorldY = beforeWorldY;

    await exportStageSnapshot({
      stage: harness.stage,
      label: "scene3 s4 drag - before - no camera change",
      relativeFilePath: `${snapshotDir}/01-before-drag.png`,
      waitMs: 60,
    });

    dragShapeInScreenSpace(s4, { deltaX: 90 });

    await exportStageSnapshot({
      stage: harness.stage,
      label: "scene3 s4 drag - after - no camera change",
      relativeFilePath: `${snapshotDir}/02-after-drag.png`,
      waitMs: 60,
    });

    expectShapePosition(s4, {
      absoluteX: draggedAbsoluteX,
      absoluteY: draggedAbsoluteY,
      localX: draggedWorldX,
      localY: draggedWorldY,
    });

    pluginContext.history.undo();
    await flushCanvasEffects();

    await exportStageSnapshot({
      stage: harness.stage,
      label: "scene3 s4 drag - after undo - no camera change",
      relativeFilePath: `${snapshotDir}/03-after-undo.png`,
      waitMs: 60,
    });

    expectShapePosition(s4, {
      absoluteX: beforeAbsolutePosition.x,
      absoluteY: beforeAbsolutePosition.y,
      localX: beforeWorldX,
      localY: beforeWorldY,
    });

    pluginContext.history.redo();
    await flushCanvasEffects();

    await exportStageSnapshot({
      stage: harness.stage,
      label: "scene3 s4 drag - after redo - no camera change",
      relativeFilePath: `${snapshotDir}/04-after-redo.png`,
      waitMs: 60,
    });

    expectShapePosition(s4, {
      absoluteX: draggedAbsoluteX,
      absoluteY: draggedAbsoluteY,
      localX: draggedWorldX,
      localY: draggedWorldY,
    });

    harness.destroy();
  });

  test("scene3: zooming out first makes the same right drag move s4 farther in world space and drag history", async () => {
    const { harness, pluginContext, s4 } = await createShapeSceneHarness();
    const snapshotDir = "tests/artifacts/shape2d-plugin/scene3-s4-drag-zoomed-out";
    const screenDragDelta = 90;

    await exportStageSnapshot({
      stage: harness.stage,
      label: "scene3 s4 drag - before zoom",
      relativeFilePath: `${snapshotDir}/01-before-zoom.png`,
      waitMs: 60,
    });

    pluginContext.camera.zoomAtScreenPoint(0.5, { x: 400, y: 300 });
    pluginContext.hooks.cameraChange.call();

    await exportStageSnapshot({
      stage: harness.stage,
      label: "scene3 s4 drag - after zoom before drag",
      relativeFilePath: `${snapshotDir}/02-after-zoom-before-drag.png`,
      waitMs: 60,
    });

    const beforeAbsolutePosition = s4.absolutePosition();
    const beforeWorldX = s4.x();
    const beforeWorldY = s4.y();
    const draggedAbsoluteX = beforeAbsolutePosition.x + screenDragDelta;
    const draggedAbsoluteY = beforeAbsolutePosition.y;
    const draggedWorldX = beforeWorldX + screenDragDelta / pluginContext.camera.zoom;
    const draggedWorldY = beforeWorldY;

    dragShapeInScreenSpace(s4, { deltaX: screenDragDelta });

    await exportStageSnapshot({
      stage: harness.stage,
      label: "scene3 s4 drag - after zoomed drag",
      relativeFilePath: `${snapshotDir}/03-after-drag.png`,
      waitMs: 60,
    });

    expect(pluginContext.camera.zoom).toBeCloseTo(0.5, 8);
    expectShapePosition(s4, {
      absoluteX: draggedAbsoluteX,
      absoluteY: draggedAbsoluteY,
      localX: draggedWorldX,
      localY: draggedWorldY,
    });

    pluginContext.history.undo();
    await flushCanvasEffects();

    await exportStageSnapshot({
      stage: harness.stage,
      label: "scene3 s4 drag - after undo - zoomed out",
      relativeFilePath: `${snapshotDir}/04-after-undo.png`,
      waitMs: 60,
    });

    expectShapePosition(s4, {
      absoluteX: beforeAbsolutePosition.x,
      absoluteY: beforeAbsolutePosition.y,
      localX: beforeWorldX,
      localY: beforeWorldY,
    });

    pluginContext.history.redo();
    await flushCanvasEffects();

    await exportStageSnapshot({
      stage: harness.stage,
      label: "scene3 s4 drag - after redo - zoomed out",
      relativeFilePath: `${snapshotDir}/05-after-redo.png`,
      waitMs: 60,
    });

    expectShapePosition(s4, {
      absoluteX: draggedAbsoluteX,
      absoluteY: draggedAbsoluteY,
      localX: draggedWorldX,
      localY: draggedWorldY,
    });

    harness.destroy();
  }, 15000);

  test("scene3: alt-dragging one item in a top-level multi-selection should clone both selected shapes", async () => {
    let pluginContext!: IPluginContext;

    const harness = await createCanvasTestHarness({
      plugins: [new Shape2dPlugin()],
      initializeScene: (context) => {
        pluginContext = context;

        const s1 = Shape2dPlugin.createRectFromElement({
          id: "rect-1",
          x: 120,
          y: 140,
          rotation: 0,
          bindings: [],
          createdAt: 1,
          locked: false,
          parentGroupId: null,
          updatedAt: 1,
          zIndex: "",
          data: { type: "rect", w: 110, h: 70 },
          style: { backgroundColor: "red" },
        });
        const s2 = Shape2dPlugin.createRectFromElement({
          id: "rect-2",
          x: 320,
          y: 170,
          rotation: 0,
          bindings: [],
          createdAt: 1,
          locked: false,
          parentGroupId: null,
          updatedAt: 1,
          zIndex: "",
          data: { type: "rect", w: 110, h: 70 },
          style: { backgroundColor: "blue" },
        });

        [s1, s2].forEach((shape) => {
          Shape2dPlugin.setupShapeListeners(context, shape);
          shape.setDraggable(true);
          context.staticForegroundLayer.add(shape);
        });
      },
    });

    const s1 = harness.staticForegroundLayer.findOne<Konva.Rect>("#rect-1")!;
    const s2 = harness.staticForegroundLayer.findOne<Konva.Rect>("#rect-2")!;
    pluginContext.setState("selection", [s1, s2]);
    await flushCanvasEffects();

    altDragShape(s2, { deltaX: 80, deltaY: 25 });
    await flushCanvasEffects();

    const rects = harness.staticForegroundLayer.find((node: Konva.Node) => node instanceof Konva.Rect) as Konva.Rect[];
    expect(rects).toHaveLength(4);

    harness.destroy();
  });

});
