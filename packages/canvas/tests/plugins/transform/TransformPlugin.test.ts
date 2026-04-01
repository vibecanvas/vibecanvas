import Konva from "konva";
import { describe, expect, test, vi } from "vitest";
import {
  CameraControlPlugin,
  EventListenerPlugin,
  GridPlugin,
  GroupPlugin,
  HelpPlugin,
  HistoryControlPlugin,
  SelectPlugin,
  Shape2dPlugin,
  TextPlugin,
  ToolbarPlugin,
  TransformPlugin,
  type IPluginContext,
} from "../../../src/plugins";
import { initializeScene01SelectOuterGroupFromChild } from "../../scenarios/01-select-outer-group-from-child";
import { initializeScene03TopLevelMixedSelection } from "../../scenarios/03-top-level-mixed-selection";
import { initializeScene04MultiselectRectAndText } from "../../scenarios/04-multiselect-rect-and-text";
import { createCanvasTestHarness, exportStageSnapshot, flushCanvasEffects } from "../../test-setup";

function getAbsoluteRectMetrics(shape: Konva.Rect) {
  const absolutePosition = shape.absolutePosition();
  const absoluteScale = shape.getAbsoluteScale();

  return {
    x: absolutePosition.x,
    y: absolutePosition.y,
    width: shape.width() * absoluteScale.x,
    height: shape.height() * absoluteScale.y,
    rotation: shape.getAbsoluteRotation(),
  };
}

function createBroaderPluginStack() {
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

async function createScene04MultiselectHarness() {
  let pluginContext!: IPluginContext;
  const { plugins } = createBroaderPluginStack();

  const harness = await createCanvasTestHarness({
    plugins,
    initializeScene: (context) => {
      pluginContext = context;
      initializeScene04MultiselectRectAndText({ context });
    },
  });

  const rect = harness.staticForegroundLayer.findOne<Konva.Rect>("#r1")!;
  const text = harness.staticForegroundLayer.findOne<Konva.Text>("#t1")!;
  const transformer = harness.dynamicLayer.getChildren().find(
    (node): node is Konva.Transformer => node instanceof Konva.Transformer,
  )!;

  expect(rect).toBeInstanceOf(Konva.Rect);
  expect(text).toBeInstanceOf(Konva.Text);
  expect(transformer).toBeTruthy();

  return { harness, pluginContext, rect, text, transformer };
}

async function createTransformSceneHarness() {
  let pluginContext!: IPluginContext;
  const { plugins, groupPlugin } = createBroaderPluginStack();

  const harness = await createCanvasTestHarness({
    plugins,
    initializeScene: (context) => {
      pluginContext = context;
      initializeScene03TopLevelMixedSelection({
        context,
        groupPlugin,
      });
    },
  });

  const s4 = harness.staticForegroundLayer.getChildren().find(
    (node): node is Konva.Rect => node instanceof Konva.Rect && node.id() === "4",
  );
  const groups = harness.staticForegroundLayer.getChildren().filter(
    (node): node is Konva.Group => node instanceof Konva.Group,
  );
  const g1 = groups[0];
  const transformer = harness.dynamicLayer.getChildren().find(
    (node): node is Konva.Transformer => node instanceof Konva.Transformer,
  );

  expect(g1).toBeTruthy();
  expect(s4).toBeTruthy();
  expect(transformer).toBeTruthy();

  return {
    harness,
    pluginContext,
    g1,
    s4: s4!,
    transformer: transformer!,
  };
}

async function createScene01TransformHarness() {
  let pluginContext!: IPluginContext;
  const { plugins, groupPlugin } = createBroaderPluginStack();

  const harness = await createCanvasTestHarness({
    plugins,
    initializeScene: (context) => {
      pluginContext = context;
      initializeScene01SelectOuterGroupFromChild({
        context,
        groupPlugin,
      });
    },
  });

  const s1 = harness.staticForegroundLayer.findOne<Konva.Rect>("#1");
  const transformer = harness.dynamicLayer.getChildren().find(
    (node): node is Konva.Transformer => node instanceof Konva.Transformer,
  );
  const g1 = harness.staticForegroundLayer.getChildren().find(
    (node): node is Konva.Group => node instanceof Konva.Group,
  );

  expect(s1).toBeTruthy();
  expect(g1).toBeTruthy();
  expect(transformer).toBeTruthy();

  return {
    harness,
    pluginContext,
    s1: s1!,
    g1: g1!,
    transformer: transformer!,
  };
}

// ---------------------------------------------------------------------------
// Multi-select transformer anchor / keepRatio tests
// ---------------------------------------------------------------------------

describe("TransformPlugin – multi-select anchors", () => {
  const CORNER_ANCHORS = ["top-left", "top-right", "bottom-left", "bottom-right"];
  const ALL_ANCHORS = [
    "top-left", "top-center", "top-right",
    "middle-right", "middle-left",
    "bottom-left", "bottom-center", "bottom-right",
  ];

  test("selecting two nodes (rect + text) uses corner-only anchors with keepRatio", async () => {
    const { harness, pluginContext, rect, text, transformer } = await createScene04MultiselectHarness();
    const snapshotDir = "tests/artifacts/transform-plugin/multiselect";

    pluginContext.setState("selection", [rect, text]);
    await flushCanvasEffects();

    await exportStageSnapshot({
      stage: harness.stage,
      label: "multiselect rect+text – anchors",
      relativeFilePath: `${snapshotDir}/01-rect-text-selected.png`,
      waitMs: 60,
    });

    expect(transformer.keepRatio()).toBe(true);
    expect(transformer.enabledAnchors()).toEqual(CORNER_ANCHORS);
    // No edge-only handles
    expect(transformer.enabledAnchors()).not.toContain("top-center");
    expect(transformer.enabledAnchors()).not.toContain("bottom-center");
    expect(transformer.enabledAnchors()).not.toContain("middle-left");
    expect(transformer.enabledAnchors()).not.toContain("middle-right");

    harness.destroy();
  });

  test("selecting two rects uses corner-only anchors with keepRatio", async () => {
    const { harness, pluginContext, transformer } = await createTransformSceneHarness();

    const s4 = harness.staticForegroundLayer.findOne<Konva.Rect>("#4")!;
    // Pick any second top-level shape by taking the rect from g1 after ungrouping:
    // Instead, use scene04 for a simpler two-rect setup
    // Here we reuse scene03's s4 + manually add another rect at top level
    const second = new Konva.Rect({ id: "extra", x: 50, y: 50, width: 80, height: 60 });
    harness.staticForegroundLayer.add(second);

    pluginContext.setState("selection", [s4, second]);
    await flushCanvasEffects();

    expect(transformer.keepRatio()).toBe(true);
    expect(transformer.enabledAnchors()).toEqual(CORNER_ANCHORS);
    expect(transformer.enabledAnchors()).not.toContain("middle-left");
    expect(transformer.enabledAnchors()).not.toContain("middle-right");
    expect(transformer.enabledAnchors()).not.toContain("top-center");
    expect(transformer.enabledAnchors()).not.toContain("bottom-center");

    harness.destroy();
  });

  test("single rect selection keeps all 8 anchors without keepRatio", async () => {
    const { harness, pluginContext, rect, transformer } = await createScene04MultiselectHarness();

    pluginContext.setState("selection", [rect]);
    await flushCanvasEffects();

    expect(transformer.keepRatio()).toBe(false);
    expect(transformer.enabledAnchors()).toEqual(ALL_ANCHORS);
    expect(transformer.enabledAnchors()).toContain("top-center");
    expect(transformer.enabledAnchors()).toContain("middle-left");
    expect(transformer.enabledAnchors()).toContain("middle-right");
    expect(transformer.enabledAnchors()).toContain("bottom-center");

    harness.destroy();
  });

  test("going from multi-select back to single-select restores all anchors", async () => {
    const { harness, pluginContext, rect, text, transformer } = await createScene04MultiselectHarness();

    // Multi-select
    pluginContext.setState("selection", [rect, text]);
    await flushCanvasEffects();
    expect(transformer.keepRatio()).toBe(true);
    expect(transformer.enabledAnchors()).toEqual(CORNER_ANCHORS);

    // Back to single rect
    pluginContext.setState("selection", [rect]);
    await flushCanvasEffects();
    expect(transformer.keepRatio()).toBe(false);
    expect(transformer.enabledAnchors()).toEqual(ALL_ANCHORS);

    harness.destroy();
  });

  test("multi-select: transformend records undo that restores both shapes", async () => {
    const { harness, pluginContext, rect, text, transformer } = await createScene04MultiselectHarness();
    const snapshotDir = "tests/artifacts/transform-plugin/multiselect";

    pluginContext.setState("selection", [rect, text]);
    await flushCanvasEffects();

    const origRectPos = { ...rect.absolutePosition() };
    const origRectW = rect.width();
    const origRectH = rect.height();
    const origTextPos = { ...text.absolutePosition() };
    const origTextFontSize = text.fontSize();

    transformer.fire("transformstart", {
      target: rect,
      currentTarget: transformer,
      evt: new MouseEvent("transformstart", { bubbles: true }),
    });

    // Simulate uniform scale (keepRatio) on both nodes
    rect.scaleX(1.5);
    rect.scaleY(1.5);
    rect.x(rect.x() + 20);
    text.scaleX(1.5);
    text.scaleY(1.5);
    text.x(text.x() + 60);
    // Fire transform on text so fontSize gets baked
    text.fire("transform", { target: text, currentTarget: text, evt: {} as Event });

    transformer.fire("transformend", {
      target: rect,
      currentTarget: transformer,
      evt: new MouseEvent("transformend", { bubbles: true }),
    });
    await flushCanvasEffects();

    await exportStageSnapshot({
      stage: harness.stage,
      label: "multiselect – after resize",
      relativeFilePath: `${snapshotDir}/02-after-resize.png`,
      waitMs: 60,
    });

    // Rect should have grown
    expect(rect.width()).toBeGreaterThan(origRectW);

    // Undo restores both shapes
    pluginContext.history.undo();
    await flushCanvasEffects();

    await exportStageSnapshot({
      stage: harness.stage,
      label: "multiselect – after undo",
      relativeFilePath: `${snapshotDir}/03-after-undo.png`,
      waitMs: 60,
    });

    expect(rect.absolutePosition().x).toBeCloseTo(origRectPos.x, 1);
    expect(rect.absolutePosition().y).toBeCloseTo(origRectPos.y, 1);
    expect(rect.width()).toBeCloseTo(origRectW, 1);
    expect(rect.height()).toBeCloseTo(origRectH, 1);
    expect(text.absolutePosition().x).toBeCloseTo(origTextPos.x, 1);
    expect(text.absolutePosition().y).toBeCloseTo(origTextPos.y, 1);
    expect(text.fontSize()).toBeCloseTo(origTextFontSize, 1);

    harness.destroy();
  });
});

describe("TransformPlugin", () => {
  test("undo after resizing s4 restores original absolute position and size", async () => {
    const { harness, pluginContext, s4, transformer } = await createTransformSceneHarness();
    const originalPosition = s4.absolutePosition();
    const originalWidth = s4.width() * s4.scaleX();
    const originalHeight = s4.height() * s4.scaleY();

    pluginContext.setState("selection", [s4]);
    await flushCanvasEffects();

    transformer.fire("transformstart", {
      target: s4,
      currentTarget: transformer,
      evt: new MouseEvent("transformstart", { bubbles: true }),
    });

    s4.x(s4.x() + 48);
    s4.y(s4.y() + 14);
    s4.scaleX(1.6);
    s4.scaleY(1.35);

    transformer.fire("transformend", {
      target: s4,
      currentTarget: transformer,
      evt: new MouseEvent("transformend", { bubbles: true }),
    });

    pluginContext.history.undo();
    await flushCanvasEffects();

    expect(s4.absolutePosition().x).toBeCloseTo(originalPosition.x, 8);
    expect(s4.absolutePosition().y).toBeCloseTo(originalPosition.y, 8);
    expect(s4.width() * s4.scaleX()).toBeCloseTo(originalWidth, 8);
    expect(s4.height() * s4.scaleY()).toBeCloseTo(originalHeight, 8);

    harness.destroy();
  });

  test("single element selection keeps free resize anchors enabled", async () => {
    const { harness, pluginContext, s4, transformer } = await createTransformSceneHarness();

    pluginContext.setState("selection", [s4]);
    await flushCanvasEffects();

    expect(transformer.keepRatio()).toBe(false);
    expect(transformer.enabledAnchors()).toEqual([
      "top-left",
      "top-center",
      "top-right",
      "middle-right",
      "middle-left",
      "bottom-left",
      "bottom-center",
      "bottom-right",
    ]);
    expect(transformer.enabledAnchors()).toContain("middle-left");
    expect(transformer.enabledAnchors()).toContain("middle-right");

    harness.destroy();
  });

  test("scene1: undo after resizing focused g1 restores children and boundary box position", async () => {
    const { harness, pluginContext, s1, g1, transformer } = await createScene01TransformHarness();
    const s2 = g1.findOne<Konva.Rect>("#2");

    expect(s1).toBeTruthy();
    expect(s2).toBeTruthy();

    const s1OriginalPosition = s1!.absolutePosition();
    const s2OriginalPosition = s2!.absolutePosition();
    const s1OriginalWidth = s1!.width() * s1!.scaleX();
    const s1OriginalHeight = s1!.height() * s1!.scaleY();
    const s2OriginalWidth = s2!.width() * s2!.scaleX();
    const s2OriginalHeight = s2!.height() * s2!.scaleY();
    const selectEvent = new MouseEvent("pointerdown", { bubbles: true, button: 0 });

    s1.fire(
      "pointerdown",
      {
        evt: selectEvent,
      },
      true,
    );
    await flushCanvasEffects();
    await new Promise((resolve) => setTimeout(resolve, 20));
    await flushCanvasEffects();

    const boundary = harness.dynamicLayer.findOne<Konva.Rect>(`.group-boundary\:${g1.id()}`);

    expect(pluginContext.state.selection.map(node => node.id())).toEqual([g1.id()]);
    expect(boundary).toBeTruthy();
    expect(boundary!.visible()).toBe(true);
    expect(transformer.keepRatio()).toBe(true);
    expect(transformer.enabledAnchors()).toEqual([
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
    ]);
    expect(transformer.enabledAnchors()).not.toContain("top-center");
    expect(transformer.enabledAnchors()).not.toContain("middle-left");
    expect(transformer.enabledAnchors()).not.toContain("middle-right");
    expect(transformer.enabledAnchors()).not.toContain("bottom-center");

    const boundaryOriginal = {
      x: boundary!.x(),
      y: boundary!.y(),
      width: boundary!.width(),
      height: boundary!.height(),
      rotation: boundary!.rotation(),
    };
    const transformerOriginal = transformer.getClientRect();
    const getStaticLayerStructure = () => {
      const topLevelChildren = harness.staticForegroundLayer.getChildren();
      const topLevelGroups = topLevelChildren.filter(
        (node): node is Konva.Group => node instanceof Konva.Group,
      );
      const topLevelShapes = topLevelChildren.filter(
        (node): node is Konva.Shape => node instanceof Konva.Shape,
      );
      const groupChildShapes = topLevelGroups.flatMap((group) => {
        return group.getChildren().filter(
          (node): node is Konva.Shape => node instanceof Konva.Shape,
        );
      });

      return {
        topLevelGroups,
        topLevelShapes,
        groupChildShapes,
      };
    };

    expect(getStaticLayerStructure().topLevelGroups).toHaveLength(1);
    expect(getStaticLayerStructure().topLevelShapes).toHaveLength(0);
    expect(getStaticLayerStructure().groupChildShapes).toHaveLength(2);

    const snapshotDir = "tests/artifacts/transform-plugin/scene1-g1";
    await exportStageSnapshot({
      stage: harness.stage,
      label: "scene1 g1 focused - before resize",
      relativeFilePath: `${snapshotDir}/01-focused-before-resize.png`,
      waitMs: 60,
    });

    transformer.fire("transformstart", {
      target: g1,
      currentTarget: transformer,
      evt: new MouseEvent("transformstart", { bubbles: true }),
    });

    g1.x(g1.x() + 36);
    g1.y(g1.y() - 24);
    g1.scaleX(1.302695499515409);
    g1.scaleY(1.3026954995154096);

    transformer.fire("transformend", {
      target: g1,
      currentTarget: transformer,
      evt: new MouseEvent("transformend", { bubbles: true }),
    });
    await flushCanvasEffects();

    expect(g1.scaleX()).toBeCloseTo(1, 8);
    expect(g1.scaleY()).toBeCloseTo(1, 8);

    expect(getStaticLayerStructure().topLevelGroups).toHaveLength(1);
    expect(getStaticLayerStructure().topLevelShapes).toHaveLength(0);
    expect(getStaticLayerStructure().groupChildShapes).toHaveLength(2);
    expect(boundary!.width()).not.toBeCloseTo(boundaryOriginal.width, 8);
    expect(transformer.getClientRect().width).not.toBeCloseTo(transformerOriginal.width, 8);

    const s1ResizedMetrics = getAbsoluteRectMetrics(s1!);
    const s2ResizedMetrics = getAbsoluteRectMetrics(s2!);
    const boundaryResized = {
      x: boundary!.x(),
      y: boundary!.y(),
      width: boundary!.width(),
      height: boundary!.height(),
      rotation: boundary!.rotation(),
    };
    const transformerResized = transformer.getClientRect();

    await exportStageSnapshot({
      stage: harness.stage,
      label: "scene1 g1 focused - after resize",
      relativeFilePath: `${snapshotDir}/02-after-resize.png`,
      waitMs: 60,
    });

    pluginContext.history.undo();
    await flushCanvasEffects();
    expect(getStaticLayerStructure().topLevelGroups).toHaveLength(1);
    expect(getStaticLayerStructure().topLevelShapes).toHaveLength(0);
    expect(getStaticLayerStructure().groupChildShapes).toHaveLength(2);
    await exportStageSnapshot({
      stage: harness.stage,
      label: "scene1 g1 focused - after undo",
      relativeFilePath: `${snapshotDir}/03-after-undo.png`,
      waitMs: 60,
    });

    expect(s1!.absolutePosition().x).toBeCloseTo(s1OriginalPosition.x, 8);
    expect(s1!.absolutePosition().y).toBeCloseTo(s1OriginalPosition.y, 8);
    expect(s2!.absolutePosition().x).toBeCloseTo(s2OriginalPosition.x, 8);
    expect(s2!.absolutePosition().y).toBeCloseTo(s2OriginalPosition.y, 8);
    expect(s1!.width() * s1!.scaleX()).toBeCloseTo(s1OriginalWidth, 8);
    expect(s1!.height() * s1!.scaleY()).toBeCloseTo(s1OriginalHeight, 8);
    expect(s2!.width() * s2!.scaleX()).toBeCloseTo(s2OriginalWidth, 8);
    expect(s2!.height() * s2!.scaleY()).toBeCloseTo(s2OriginalHeight, 8);
    expect(boundary!.visible()).toBe(true);
    expect(boundary!.x()).toBeCloseTo(boundaryOriginal.x, 8);
    expect(boundary!.y()).toBeCloseTo(boundaryOriginal.y, 8);
    expect(boundary!.width()).toBeCloseTo(boundaryOriginal.width, 8);
    expect(boundary!.height()).toBeCloseTo(boundaryOriginal.height, 8);
    expect(boundary!.rotation()).toBeCloseTo(boundaryOriginal.rotation, 8);
    expect(transformer.getClientRect().x).toBeCloseTo(transformerOriginal.x, 8);
    expect(transformer.getClientRect().y).toBeCloseTo(transformerOriginal.y, 8);
    expect(transformer.getClientRect().width).toBeCloseTo(transformerOriginal.width, 8);
    expect(transformer.getClientRect().height).toBeCloseTo(transformerOriginal.height, 8);

    pluginContext.history.redo();
    await flushCanvasEffects();
    expect(getStaticLayerStructure().topLevelGroups).toHaveLength(1);
    expect(getStaticLayerStructure().topLevelShapes).toHaveLength(0);
    expect(getStaticLayerStructure().groupChildShapes).toHaveLength(2);
    await exportStageSnapshot({
      stage: harness.stage,
      label: "scene1 g1 focused - after redo",
      relativeFilePath: `${snapshotDir}/04-after-redo.png`,
      waitMs: 60,
    });

    expect(getAbsoluteRectMetrics(s1!).x).toBeCloseTo(s1ResizedMetrics.x, 8);
    expect(getAbsoluteRectMetrics(s1!).y).toBeCloseTo(s1ResizedMetrics.y, 8);
    expect(getAbsoluteRectMetrics(s2!).x).toBeCloseTo(s2ResizedMetrics.x, 8);
    expect(getAbsoluteRectMetrics(s2!).y).toBeCloseTo(s2ResizedMetrics.y, 8);
    expect(getAbsoluteRectMetrics(s1!).width).toBeCloseTo(s1ResizedMetrics.width, 8);
    expect(getAbsoluteRectMetrics(s1!).height).toBeCloseTo(s1ResizedMetrics.height, 8);
    expect(getAbsoluteRectMetrics(s2!).width).toBeCloseTo(s2ResizedMetrics.width, 8);
    expect(getAbsoluteRectMetrics(s2!).height).toBeCloseTo(s2ResizedMetrics.height, 8);
    expect(boundary!.x()).toBeCloseTo(boundaryResized.x, 8);
    expect(boundary!.y()).toBeCloseTo(boundaryResized.y, 8);
    expect(boundary!.width()).toBeCloseTo(boundaryResized.width, 8);
    expect(boundary!.height()).toBeCloseTo(boundaryResized.height, 8);
    expect(boundary!.rotation()).toBeCloseTo(boundaryResized.rotation, 8);
    expect(transformer.getClientRect().x).toBeCloseTo(transformerResized.x, 8);
    expect(transformer.getClientRect().y).toBeCloseTo(transformerResized.y, 8);
    expect(transformer.getClientRect().width).toBeCloseTo(transformerResized.width, 8);
    expect(transformer.getClientRect().height).toBeCloseTo(transformerResized.height, 8);

    harness.destroy();
  }, 15000);

  test("undo/redo after resizing s4 under camera zoom restores correct world-space position", async () => {
    const { harness, pluginContext, s4, transformer } = await createTransformSceneHarness();
    const snapshotDir = "tests/artifacts/transform-plugin/camera-zoom-undo-redo";

    // 1. Snapshot original world-space metrics
    const originalWorldX = s4.x();
    const originalWorldY = s4.y();
    const originalWorldW = s4.width() * s4.scaleX();
    const originalWorldH = s4.height() * s4.scaleY();

    await exportStageSnapshot({
      stage: harness.stage,
      label: "camera zoom undo redo - 01 initial",
      relativeFilePath: `${snapshotDir}/01-initial.png`,
      waitMs: 60,
    });

    // 2. Zoom out to 0.5x
    pluginContext.camera.zoomAtScreenPoint(0.5, { x: 400, y: 300 });
    pluginContext.hooks.cameraChange.call();
    await flushCanvasEffects();

    await exportStageSnapshot({
      stage: harness.stage,
      label: "camera zoom undo redo - 02 zoomed out 0.5x",
      relativeFilePath: `${snapshotDir}/02-zoomed-out.png`,
      waitMs: 60,
    });

    // 3. Select s4 and resize
    pluginContext.setState("selection", [s4]);
    await flushCanvasEffects();

    transformer.fire("transformstart", {
      target: s4,
      currentTarget: transformer,
      evt: new MouseEvent("transformstart", { bubbles: true }),
    });

    s4.x(s4.x() + 80);
    s4.y(s4.y() + 30);
    s4.scaleX(1.8);
    s4.scaleY(1.5);

    transformer.fire("transformend", {
      target: s4,
      currentTarget: transformer,
      evt: new MouseEvent("transformend", { bubbles: true }),
    });
    await flushCanvasEffects();

    // 4. Capture post-resize world metrics
    const resizedWorldX = s4.x();
    const resizedWorldY = s4.y();
    const resizedWorldW = s4.width() * s4.scaleX();
    const resizedWorldH = s4.height() * s4.scaleY();

    await exportStageSnapshot({
      stage: harness.stage,
      label: "camera zoom undo redo - 03 after resize",
      relativeFilePath: `${snapshotDir}/03-after-resize.png`,
      waitMs: 60,
    });

    // 5. Undo — world-space must be restored to original
    pluginContext.history.undo();
    await flushCanvasEffects();

    await exportStageSnapshot({
      stage: harness.stage,
      label: "camera zoom undo redo - 04 after undo",
      relativeFilePath: `${snapshotDir}/04-after-undo.png`,
      waitMs: 60,
    });

    expect(s4.x()).toBeCloseTo(originalWorldX, 8);
    expect(s4.y()).toBeCloseTo(originalWorldY, 8);
    expect(s4.width() * s4.scaleX()).toBeCloseTo(originalWorldW, 8);
    expect(s4.height() * s4.scaleY()).toBeCloseTo(originalWorldH, 8);

    // 6. Redo — world-space must be back to post-resize values
    pluginContext.history.redo();
    await flushCanvasEffects();

    await exportStageSnapshot({
      stage: harness.stage,
      label: "camera zoom undo redo - 05 after redo",
      relativeFilePath: `${snapshotDir}/05-after-redo.png`,
      waitMs: 60,
    });

    expect(s4.x()).toBeCloseTo(resizedWorldX, 8);
    expect(s4.y()).toBeCloseTo(resizedWorldY, 8);
    expect(s4.width() * s4.scaleX()).toBeCloseTo(resizedWorldW, 8);
    expect(s4.height() * s4.scaleY()).toBeCloseTo(resizedWorldH, 8);

    harness.destroy();
  }, 15000);

  test("scene1: undo after rotating focused g1 restores children, boundary box, and transformer", async () => {
    const { harness, pluginContext, s1, g1, transformer } = await createScene01TransformHarness();
    const s2 = g1.findOne<Konva.Rect>("#2");

    expect(s1).toBeTruthy();
    expect(s2).toBeTruthy();

    const s1OriginalPosition = s1!.absolutePosition();
    const s2OriginalPosition = s2!.absolutePosition();
    const s1OriginalRotation = s1!.rotation();
    const s2OriginalRotation = s2!.rotation();
    const selectEvent = new MouseEvent("pointerdown", { bubbles: true, button: 0 });

    s1.fire(
      "pointerdown",
      {
        evt: selectEvent,
      },
      true,
    );
    await flushCanvasEffects();
    await new Promise((resolve) => setTimeout(resolve, 20));
    await flushCanvasEffects();

    const boundary = harness.dynamicLayer.findOne<Konva.Rect>(`.group-boundary\:${g1.id()}`);

    expect(pluginContext.state.selection.map(node => node.id())).toEqual([g1.id()]);
    expect(boundary).toBeTruthy();
    expect(boundary!.visible()).toBe(true);

    const boundaryOriginal = {
      x: boundary!.x(),
      y: boundary!.y(),
      width: boundary!.width(),
      height: boundary!.height(),
      rotation: boundary!.rotation(),
    };
    const transformerOriginal = transformer.getClientRect();

    const snapshotDir = "tests/artifacts/transform-plugin/scene1-g1-rotate";
    await exportStageSnapshot({
      stage: harness.stage,
      label: "scene1 g1 focused - before rotate",
      relativeFilePath: `${snapshotDir}/01-focused-before-rotate.png`,
      waitMs: 60,
    });

    transformer.fire("transformstart", {
      target: g1,
      currentTarget: transformer,
      evt: new MouseEvent("transformstart", { bubbles: true }),
    });

    g1.rotation(g1.rotation() + 43.07047024160677);

    transformer.fire("transformend", {
      target: g1,
      currentTarget: transformer,
      evt: new MouseEvent("transformend", { bubbles: true }),
    });
    await flushCanvasEffects();

    expect(g1.rotation()).toBeCloseTo(0, 8);

    const s1RotatedMetrics = getAbsoluteRectMetrics(s1!);
    const s2RotatedMetrics = getAbsoluteRectMetrics(s2!);
    const boundaryRotated = {
      x: boundary!.x(),
      y: boundary!.y(),
      width: boundary!.width(),
      height: boundary!.height(),
      rotation: boundary!.rotation(),
    };
    const transformerRotated = transformer.getClientRect();

    await exportStageSnapshot({
      stage: harness.stage,
      label: "scene1 g1 focused - after rotate",
      relativeFilePath: `${snapshotDir}/02-after-rotate.png`,
      waitMs: 60,
    });

    pluginContext.history.undo();
    await flushCanvasEffects();
    await exportStageSnapshot({
      stage: harness.stage,
      label: "scene1 g1 focused - after undo rotate",
      relativeFilePath: `${snapshotDir}/03-after-undo.png`,
      waitMs: 60,
    });

    expect(s1!.absolutePosition().x).toBeCloseTo(s1OriginalPosition.x, 8);
    expect(s1!.absolutePosition().y).toBeCloseTo(s1OriginalPosition.y, 8);
    expect(s2!.absolutePosition().x).toBeCloseTo(s2OriginalPosition.x, 8);
    expect(s2!.absolutePosition().y).toBeCloseTo(s2OriginalPosition.y, 8);
    expect(s1!.rotation()).toBeCloseTo(s1OriginalRotation, 8);
    expect(s2!.rotation()).toBeCloseTo(s2OriginalRotation, 8);
    expect(boundary!.x()).toBeCloseTo(boundaryOriginal.x, 8);
    expect(boundary!.y()).toBeCloseTo(boundaryOriginal.y, 8);
    expect(boundary!.width()).toBeCloseTo(boundaryOriginal.width, 8);
    expect(boundary!.height()).toBeCloseTo(boundaryOriginal.height, 8);
    expect(boundary!.rotation()).toBeCloseTo(boundaryOriginal.rotation, 8);
    expect(transformer.getClientRect().x).toBeCloseTo(transformerOriginal.x, 8);
    expect(transformer.getClientRect().y).toBeCloseTo(transformerOriginal.y, 8);
    expect(transformer.getClientRect().width).toBeCloseTo(transformerOriginal.width, 8);
    expect(transformer.getClientRect().height).toBeCloseTo(transformerOriginal.height, 8);

    pluginContext.history.redo();
    await flushCanvasEffects();
    await exportStageSnapshot({
      stage: harness.stage,
      label: "scene1 g1 focused - after redo rotate",
      relativeFilePath: `${snapshotDir}/04-after-redo.png`,
      waitMs: 60,
    });

    expect(getAbsoluteRectMetrics(s1!).x).toBeCloseTo(s1RotatedMetrics.x, 8);
    expect(getAbsoluteRectMetrics(s1!).y).toBeCloseTo(s1RotatedMetrics.y, 8);
    expect(getAbsoluteRectMetrics(s2!).x).toBeCloseTo(s2RotatedMetrics.x, 8);
    expect(getAbsoluteRectMetrics(s2!).y).toBeCloseTo(s2RotatedMetrics.y, 8);
    expect(getAbsoluteRectMetrics(s1!).rotation).toBeCloseTo(s1RotatedMetrics.rotation, 8);
    expect(getAbsoluteRectMetrics(s2!).rotation).toBeCloseTo(s2RotatedMetrics.rotation, 8);
    expect(boundary!.x()).toBeCloseTo(boundaryRotated.x, 8);
    expect(boundary!.y()).toBeCloseTo(boundaryRotated.y, 8);
    expect(boundary!.width()).toBeCloseTo(boundaryRotated.width, 8);
    expect(boundary!.height()).toBeCloseTo(boundaryRotated.height, 8);
    expect(boundary!.rotation()).toBeCloseTo(boundaryRotated.rotation, 8);
    expect(transformer.getClientRect().x).toBeCloseTo(transformerRotated.x, 8);
    expect(transformer.getClientRect().y).toBeCloseTo(transformerRotated.y, 8);
    expect(transformer.getClientRect().width).toBeCloseTo(transformerRotated.width, 8);
    expect(transformer.getClientRect().height).toBeCloseTo(transformerRotated.height, 8);

    harness.destroy();
  }, 15000);
});
