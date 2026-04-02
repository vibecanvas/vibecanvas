import Konva from "konva";
import { createEffect } from "solid-js";
import { describe, expect, test, vi } from "vitest";
import { GroupPlugin, SelectPlugin, Shape2dPlugin, TextPlugin, TransformPlugin, type IPlugin, type IPluginContext } from "../../../src/plugins";
import { initializeScene01SelectOuterGroupFromChild } from "../../scenarios/01-select-outer-group-from-child";
import { initializeScene02NestedGroupsLeafShapes } from "../../scenarios/02-nested-groups-leaf-shapes";
import { initializeScene05GroupWithTextAndRect } from "../../scenarios/05-group-with-text-and-rect";
import { initializeScene03TopLevelMixedSelection } from "../../scenarios/03-top-level-mixed-selection";
import { createCanvasTestHarness, createMockDocHandle, createStagePointerEvent, flushCanvasEffects } from "../../test-setup";

class SelectionProbePlugin implements IPlugin {
  observedSelectionIds: string[] = [];
  observedFocusedId: string | null = null;

  apply(context: IPluginContext): void {
    context.hooks.init.tap(() => {
      createEffect(() => {
        this.observedSelectionIds = context.state.selection.map((node) => node.id());
      });

      createEffect(() => {
        this.observedFocusedId = context.state.focusedId;
      });
    });
  }
}

async function createSelectionSceneHarness() {
  const groupPlugin = new GroupPlugin();
  const selectionProbePlugin = new SelectionProbePlugin();
  const plugins: IPlugin[] = [
    new SelectPlugin(),
    new TransformPlugin(),
    groupPlugin,
    selectionProbePlugin,
  ];

  const harness = await createCanvasTestHarness({
    plugins,
    initializeScene: (context) => {
      initializeScene01SelectOuterGroupFromChild({
        context,
        groupPlugin,
      });
    },
  });

  const { staticForegroundLayer, dynamicLayer } = harness;
  const s1 = staticForegroundLayer.findOne<Konva.Rect>("#1");
  const g1 = staticForegroundLayer.getChildren().find((node): node is Konva.Group => node instanceof Konva.Group);

  expect(s1).toBeTruthy();
  expect(g1).toBeTruthy();

  return {
    harness,
    dynamicLayer,
    selectionProbePlugin,
    s1: s1!,
    g1: g1!,
  };
}

async function createNestedSelectionSceneHarness() {
  const groupPlugin = new GroupPlugin();
  const selectionProbePlugin = new SelectionProbePlugin();
  const plugins: IPlugin[] = [
    new SelectPlugin(),
    new TransformPlugin(),
    groupPlugin,
    selectionProbePlugin,
  ];

  const harness = await createCanvasTestHarness({
    plugins,
    initializeScene: (context) => {
      initializeScene02NestedGroupsLeafShapes({
        context,
        groupPlugin,
      });
    },
  });

  const { staticForegroundLayer, dynamicLayer } = harness;
  const s1 = staticForegroundLayer.findOne<Konva.Rect>("#1");
  const s3 = staticForegroundLayer.findOne<Konva.Rect>("#3");
  const g1 = staticForegroundLayer.getChildren().find((node): node is Konva.Group => node instanceof Konva.Group);
  const g2 = g1?.findOne<Konva.Group>((node: any) => node instanceof Konva.Group) ?? null;

  expect(s1).toBeTruthy();
  expect(s3).toBeTruthy();
  expect(g1).toBeTruthy();
  expect(g2).toBeTruthy();

  return {
    harness,
    dynamicLayer,
    selectionProbePlugin,
    s1: s1!,
    s3: s3!,
    g1: g1!,
    g2: g2!,
  };
}

async function createTopLevelSelectionSceneHarness() {
  let context!: IPluginContext;
  const groupPlugin = new GroupPlugin();
  const selectionProbePlugin = new SelectionProbePlugin();
  const plugins: IPlugin[] = [
    new SelectPlugin(),
    new TransformPlugin(),
    groupPlugin,
    selectionProbePlugin,
  ];

  const harness = await createCanvasTestHarness({
    plugins,
    initializeScene: (ctx) => {
      context = ctx;
      initializeScene03TopLevelMixedSelection({
        context: ctx,
        groupPlugin,
      });
    },
  });

  const { staticForegroundLayer } = harness;
  const groups = staticForegroundLayer.getChildren().filter((node): node is Konva.Group => node instanceof Konva.Group);
  const g1 = groups[0];
  const g2 = groups[1];
  const s4 = staticForegroundLayer.getChildren().find((node): node is Konva.Rect => node instanceof Konva.Rect && node.id() === "4");

  expect(g1).toBeTruthy();
  expect(g2).toBeTruthy();
  expect(s4).toBeTruthy();

  return {
    harness,
    context,
    selectionProbePlugin,
    g1,
    g2,
    s4: s4!,
  };
}

async function createDeleteNestedSelectionHarness() {
  let context!: IPluginContext;
  const docHandle = createMockDocHandle();
  const groupPlugin = new GroupPlugin();
  const selectionProbePlugin = new SelectionProbePlugin();
  const plugins: IPlugin[] = [
    new SelectPlugin(),
    new TransformPlugin(),
    new Shape2dPlugin(),
    new TextPlugin(),
    groupPlugin,
    selectionProbePlugin,
  ];

  const harness = await createCanvasTestHarness({
    plugins,
    docHandle,
    initializeScene: (ctx) => {
      context = ctx;
      initializeScene02NestedGroupsLeafShapes({ context: ctx, groupPlugin });
    },
  });

  const s1 = harness.staticForegroundLayer.findOne<Konva.Rect>("#1");
  const s2 = harness.staticForegroundLayer.findOne<Konva.Rect>("#2");
  const s3 = harness.staticForegroundLayer.findOne<Konva.Rect>("#3");
  const g1 = harness.staticForegroundLayer.getChildren().find((node): node is Konva.Group => node instanceof Konva.Group);
  const g2 = g1?.findOne<Konva.Group>((node: any) => node instanceof Konva.Group) ?? null;

  expect(s1).toBeTruthy();
  expect(s2).toBeTruthy();
  expect(s3).toBeTruthy();
  expect(g1).toBeTruthy();
  expect(g2).toBeTruthy();

  return {
    harness,
    context,
    docHandle,
    selectionProbePlugin,
    s1: s1!,
    s2: s2!,
    s3: s3!,
    g1: g1!,
    g2: g2!,
  };
}

async function createDeleteGroupWithTextHarness() {
  let context!: IPluginContext;
  const docHandle = createMockDocHandle();
  const groupPlugin = new GroupPlugin();
  const selectionProbePlugin = new SelectionProbePlugin();
  const plugins: IPlugin[] = [
    new SelectPlugin(),
    new TransformPlugin(),
    new Shape2dPlugin(),
    new TextPlugin(),
    groupPlugin,
    selectionProbePlugin,
  ];

  const harness = await createCanvasTestHarness({
    plugins,
    docHandle,
    initializeScene: (ctx) => {
      context = ctx;
      initializeScene05GroupWithTextAndRect({ context: ctx, groupPlugin });
    },
  });

  const group = harness.staticForegroundLayer.getChildren().find((node): node is Konva.Group => node instanceof Konva.Group);
  const text = group?.findOne<Konva.Text>("#t1");
  const rect = group?.findOne<Konva.Rect>("#r1");

  expect(group).toBeTruthy();
  expect(text).toBeTruthy();
  expect(rect).toBeTruthy();

  return {
    harness,
    context,
    docHandle,
    selectionProbePlugin,
    group: group!,
    text: text!,
    rect: rect!,
  };
}

function fireKeydown(context: IPluginContext, args: { key: string; target?: EventTarget | null }) {
  const event = new KeyboardEvent("keydown", { key: args.key, bubbles: true });
  const target = args.target ?? context.stage.container();
  Object.defineProperty(event, "target", { configurable: true, value: target });
  context.hooks.keydown.call(event);
}

function dispatchKeyboardEvent(target: EventTarget, type: "keydown" | "keyup", init: KeyboardEventInit) {
  const event = new KeyboardEvent(type, { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

function getDocIds(docHandle: ReturnType<typeof createMockDocHandle>) {
  const doc = docHandle.doc();
  return {
    groupIds: Object.keys(doc.groups).sort(),
    elementIds: Object.keys(doc.elements).sort(),
  };
}

async function createAttachedRectTextDeleteHarness() {
  let context!: IPluginContext;
  const docHandle = createMockDocHandle();

  const harness = await createCanvasTestHarness({
    docHandle,
    plugins: [new SelectPlugin(), new TransformPlugin(), new Shape2dPlugin(), new TextPlugin(), new GroupPlugin()],
    initializeScene: (ctx) => {
      context = ctx;
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

      Shape2dPlugin.setupShapeListeners(ctx, rect);
      rect.setDraggable(true);
      ctx.staticForegroundLayer.add(rect);
      ctx.crdt.patch({ elements: [Shape2dPlugin.toTElement(rect)], groups: [] });
    },
  });

  const rect = harness.staticForegroundLayer.findOne<Konva.Rect>("#attached-rect-1");
  expect(rect).toBeTruthy();

  context.setState("selection", [rect!]);
  await flushCanvasEffects();
  context.hooks.keydown.call(dispatchKeyboardEvent(context.stage.container(), "keydown", { key: "Enter" }));
  await flushCanvasEffects();

  const textarea = context.stage.container().querySelector("textarea") as HTMLTextAreaElement;
  textarea.value = "hello rect";
  textarea.dispatchEvent(new Event("blur"));
  await flushCanvasEffects();

  const attachedText = harness.staticForegroundLayer.findOne<Konva.Text>((node: Konva.Node) => {
    return node instanceof Konva.Text && TextPlugin.getContainerId(node) === rect!.id();
  });

  expect(attachedText).toBeTruthy();

  return {
    harness,
    context,
    docHandle,
    rect: rect!,
    attachedText: attachedText!,
  };
}

describe("SelectPlugin", () => {
  test("scene1: s1 pointerdown -> outergroup is selected with transformer and boundary box", async () => {
    vi.useFakeTimers();

    const setNodesSpy = vi.spyOn(Konva.Transformer.prototype, "setNodes");
    const { harness, dynamicLayer, selectionProbePlugin, s1, g1 } = await createSelectionSceneHarness();

    s1.fire(
      "pointerdown",
      {
        evt: new MouseEvent("pointerdown", { bubbles: true, button: 0 }),
      },
      true,
    );

    await flushCanvasEffects();

    expect(selectionProbePlugin.observedSelectionIds).toEqual([g1.id()]);

    const transformer = dynamicLayer.getChildren().find(
      (node): node is Konva.Transformer => node instanceof Konva.Transformer,
    );
    expect(transformer).toBeTruthy();
    expect(transformer!.isVisible()).toBe(true);
    expect(setNodesSpy).toHaveBeenCalledWith([g1]);

    const boundary = dynamicLayer.getChildren().find(
      (node): node is Konva.Rect => node instanceof Konva.Rect && node.name() === `group-boundary:${g1.id()}`,
    );
    expect(boundary).toBeTruthy();
    expect(boundary!.visible()).toBe(true);

    harness.destroy();
    setNodesSpy.mockRestore();
    vi.useRealTimers();
  });

  test("scene1: s1 pointerdblclick after group selection -> boundary stays on group and transformer targets red shape", async () => {
    vi.useFakeTimers();

    const setNodesSpy = vi.spyOn(Konva.Transformer.prototype, "setNodes");
    const { harness, dynamicLayer, selectionProbePlugin, s1, g1 } = await createSelectionSceneHarness();

    s1.fire(
      "pointerdown",
      {
        evt: new MouseEvent("pointerdown", { bubbles: true, button: 0 }),
      },
      true,
    );

    await flushCanvasEffects();

    s1.fire(
      "pointerdblclick",
      {
        evt: new MouseEvent("pointerdblclick", { bubbles: true, button: 0 }),
      },
      true,
    );

    await flushCanvasEffects();

    expect(selectionProbePlugin.observedSelectionIds).toEqual([g1.id(), s1.id()]);

    const transformer = dynamicLayer.getChildren().find(
      (node): node is Konva.Transformer => node instanceof Konva.Transformer,
    );
    expect(transformer).toBeTruthy();
    expect(transformer!.isVisible()).toBe(true);
    expect(setNodesSpy).toHaveBeenLastCalledWith([s1]);

    const boundary = dynamicLayer.getChildren().find(
      (node): node is Konva.Rect => node instanceof Konva.Rect && node.name() === `group-boundary:${g1.id()}`,
    );
    expect(boundary).toBeTruthy();
    expect(boundary!.visible()).toBe(true);

    harness.destroy();
    setNodesSpy.mockRestore();
    vi.useRealTimers();
  });

  test("scene3: shift+pointerdown adds top-level group and top-level shape", async () => {
    vi.useFakeTimers();

    const { harness, selectionProbePlugin, g1, g2, s4 } = await createTopLevelSelectionSceneHarness();

    g1.fire(
      "pointerdown",
      {
        evt: new MouseEvent("pointerdown", { bubbles: true, button: 0 }),
      },
      true,
    );

    await flushCanvasEffects();

    expect(selectionProbePlugin.observedSelectionIds).toEqual([g1.id()]);

    g2.fire(
      "pointerdown",
      {
        evt: new MouseEvent("pointerdown", { bubbles: true, button: 0, shiftKey: true }),
      },
      true,
    );

    await flushCanvasEffects();

    expect(selectionProbePlugin.observedSelectionIds).toEqual([g1.id(), g2.id()]);

    s4.fire(
      "pointerdown",
      {
        evt: new MouseEvent("pointerdown", { bubbles: true, button: 0, shiftKey: true }),
      },
      true,
    );

    await flushCanvasEffects();

    expect(selectionProbePlugin.observedSelectionIds).toEqual([g1.id(), g2.id(), s4.id()]);

    harness.destroy();
    vi.useRealTimers();
  });

  test("scene3: shift+pointerdown on an already selected top-level node removes it", async () => {
    vi.useFakeTimers();

    const { harness, selectionProbePlugin, g1, g2, s4 } = await createTopLevelSelectionSceneHarness();

    g1.fire(
      "pointerdown",
      {
        evt: new MouseEvent("pointerdown", { bubbles: true, button: 0 }),
      },
      true,
    );
    await flushCanvasEffects();

    g2.fire(
      "pointerdown",
      {
        evt: new MouseEvent("pointerdown", { bubbles: true, button: 0, shiftKey: true }),
      },
      true,
    );
    await flushCanvasEffects();

    s4.fire(
      "pointerdown",
      {
        evt: new MouseEvent("pointerdown", { bubbles: true, button: 0, shiftKey: true }),
      },
      true,
    );
    await flushCanvasEffects();

    expect(selectionProbePlugin.observedSelectionIds).toEqual([g1.id(), g2.id(), s4.id()]);

    g2.fire(
      "pointerdown",
      {
        evt: new MouseEvent("pointerdown", { bubbles: true, button: 0, shiftKey: true }),
      },
      true,
    );
    await flushCanvasEffects();

    expect(selectionProbePlugin.observedSelectionIds).toEqual([g1.id(), s4.id()]);

    harness.destroy();
    vi.useRealTimers();
  });

  test("scene2: s1 pointerdblclick -> g1 and g2 show boundaries and transformer targets g2", async () => {
    vi.useFakeTimers();

    const setNodesSpy = vi.spyOn(Konva.Transformer.prototype, "setNodes");
    const { harness, dynamicLayer, selectionProbePlugin, s1, g1, g2 } = await createNestedSelectionSceneHarness();

    s1.fire(
      "pointerdown",
      {
        evt: new MouseEvent("pointerdown", { bubbles: true, button: 0 }),
      },
      true,
    );
    await flushCanvasEffects();

    s1.fire(
      "pointerdblclick",
      {
        evt: new MouseEvent("pointerdblclick", { bubbles: true, button: 0 }),
      },
      true,
    );

    await flushCanvasEffects();

    expect(selectionProbePlugin.observedSelectionIds).toEqual([g1.id(), g2.id()]);

    const transformer = dynamicLayer.getChildren().find(
      (node): node is Konva.Transformer => node instanceof Konva.Transformer,
    );
    expect(transformer).toBeTruthy();
    expect(transformer!.isVisible()).toBe(true);
    expect(setNodesSpy).toHaveBeenLastCalledWith([g2]);

    const g1Boundary = dynamicLayer.findOne<Konva.Rect>(`.group-boundary\:${g1.id()}`);
    const g2Boundary = dynamicLayer.findOne<Konva.Rect>(`.group-boundary\:${g2.id()}`);
    expect(g1Boundary).toBeTruthy();
    expect(g1Boundary!.visible()).toBe(true);
    expect(g2Boundary).toBeTruthy();
    expect(g2Boundary!.visible()).toBe(true);

    harness.destroy();
    setNodesSpy.mockRestore();
    vi.useRealTimers();
  });

  test("scene2: s1 pointerdown twice with delay -> only outer group stays focused", async () => {
    vi.useFakeTimers();

    const setNodesSpy = vi.spyOn(Konva.Transformer.prototype, "setNodes");
    const { harness, dynamicLayer, selectionProbePlugin, s1, g1, g2 } = await createNestedSelectionSceneHarness();

    s1.fire(
      "pointerdown",
      {
        evt: new MouseEvent("pointerdown", { bubbles: true, button: 0 }),
      },
      true,
    );

    await flushCanvasEffects();

    expect(selectionProbePlugin.observedSelectionIds).toEqual([g1.id()]);

    const transformer = dynamicLayer.getChildren().find(
      (node): node is Konva.Transformer => node instanceof Konva.Transformer,
    );
    expect(transformer).toBeTruthy();
    expect(transformer!.isVisible()).toBe(true);
    expect(setNodesSpy).toHaveBeenLastCalledWith([g1]);

    const g1Boundary = dynamicLayer.findOne<Konva.Rect>(`.group-boundary\:${g1.id()}`);
    const g2BoundaryBefore = dynamicLayer.findOne<Konva.Rect>(`.group-boundary\:${g2.id()}`);
    expect(g1Boundary).toBeTruthy();
    expect(g1Boundary!.visible()).toBe(true);
    expect(g2BoundaryBefore).toBeFalsy();

    vi.advanceTimersByTime(20);
    await flushCanvasEffects();

    s1.fire(
      "pointerdown",
      {
        evt: new MouseEvent("pointerdown", { bubbles: true, button: 0 }),
      },
      true,
    );

    await flushCanvasEffects();

    expect(selectionProbePlugin.observedSelectionIds).toEqual([g1.id()]);
    expect(setNodesSpy).toHaveBeenLastCalledWith([g1]);

    const g2BoundaryAfter = dynamicLayer.findOne<Konva.Rect>(`.group-boundary\:${g2.id()}`);
    expect(g1Boundary!.visible()).toBe(true);
    expect(g2BoundaryAfter).toBeFalsy();
    expect(transformer!.isVisible()).toBe(true);

    harness.destroy();
    setNodesSpy.mockRestore();
    vi.useRealTimers();
  });

  test("scene2: s1 pointerdblclick twice -> g1 and g2 keep boundaries and transformer targets s1", async () => {
    vi.useFakeTimers();

    const setNodesSpy = vi.spyOn(Konva.Transformer.prototype, "setNodes");
    const { harness, dynamicLayer, selectionProbePlugin, s1, g1, g2 } = await createNestedSelectionSceneHarness();

    s1.fire(
      "pointerdown",
      {
        evt: new MouseEvent("pointerdown", { bubbles: true, button: 0 }),
      },
      true,
    );
    await flushCanvasEffects();

    s1.fire(
      "pointerdblclick",
      {
        evt: new MouseEvent("pointerdblclick", { bubbles: true, button: 0 }),
      },
      true,
    );
    await flushCanvasEffects();

    s1.fire(
      "pointerdblclick",
      {
        evt: new MouseEvent("pointerdblclick", { bubbles: true, button: 0 }),
      },
      true,
    );

    await flushCanvasEffects();

    expect(selectionProbePlugin.observedSelectionIds).toEqual([g1.id(), g2.id(), s1.id()]);

    const transformer = dynamicLayer.getChildren().find(
      (node): node is Konva.Transformer => node instanceof Konva.Transformer,
    );
    expect(transformer).toBeTruthy();
    expect(transformer!.isVisible()).toBe(true);
    expect(setNodesSpy).toHaveBeenLastCalledWith([s1]);

    const g1Boundary = dynamicLayer.findOne<Konva.Rect>(`.group-boundary\:${g1.id()}`);
    const g2Boundary = dynamicLayer.findOne<Konva.Rect>(`.group-boundary\:${g2.id()}`);
    expect(g1Boundary).toBeTruthy();
    expect(g1Boundary!.visible()).toBe(true);
    expect(g2Boundary).toBeTruthy();
    expect(g2Boundary!.visible()).toBe(true);

    harness.destroy();
    setNodesSpy.mockRestore();
    vi.useRealTimers();
  });

  test("scene2: s1 pointerdblclick twice then s3 pointerdown -> focus switches to s3", async () => {
    vi.useFakeTimers();

    const setNodesSpy = vi.spyOn(Konva.Transformer.prototype, "setNodes");
    const { harness, dynamicLayer, selectionProbePlugin, s1, s3, g1 } = await createNestedSelectionSceneHarness();

    s1.fire(
      "pointerdown",
      {
        evt: new MouseEvent("pointerdown", { bubbles: true, button: 0 }),
      },
      true,
    );
    await flushCanvasEffects();

    s1.fire(
      "pointerdblclick",
      {
        evt: new MouseEvent("pointerdblclick", { bubbles: true, button: 0 }),
      },
      true,
    );
    await flushCanvasEffects();

    s1.fire(
      "pointerdblclick",
      {
        evt: new MouseEvent("pointerdblclick", { bubbles: true, button: 0 }),
      },
      true,
    );
    await flushCanvasEffects();

    s3.fire(
      "pointerdown",
      {
        evt: new MouseEvent("pointerdown", { bubbles: true, button: 0 }),
      },
      true,
    );
    await flushCanvasEffects();

    expect(selectionProbePlugin.observedSelectionIds).toEqual([g1.id(), s3.id()]);

    const transformer = dynamicLayer.getChildren().find(
      (node): node is Konva.Transformer => node instanceof Konva.Transformer,
    );
    expect(transformer).toBeTruthy();
    expect(transformer!.isVisible()).toBe(true);
    expect(setNodesSpy).toHaveBeenLastCalledWith([s3]);

    const g1Boundary = dynamicLayer.findOne<Konva.Rect>(`.group-boundary\:${g1.id()}`);
    expect(g1Boundary).toBeTruthy();
    expect(g1Boundary!.visible()).toBe(true);

    harness.destroy();
    setNodesSpy.mockRestore();
    vi.useRealTimers();
  });

  test("delete: Backspace removes drilled nested selection from highest selected owner and supports undo/redo", async () => {
    const { harness, context, docHandle, selectionProbePlugin, s1, g1, g2 } = await createDeleteNestedSelectionHarness();

    s1.fire("pointerdown", { evt: new MouseEvent("pointerdown", { bubbles: true, button: 0 }) }, true);
    await flushCanvasEffects();
    s1.fire("pointerdblclick", { evt: new MouseEvent("pointerdblclick", { bubbles: true, button: 0 }) }, true);
    await flushCanvasEffects();
    s1.fire("pointerdblclick", { evt: new MouseEvent("pointerdblclick", { bubbles: true, button: 0 }) }, true);
    await flushCanvasEffects();

    expect(selectionProbePlugin.observedSelectionIds).toEqual([g1.id(), g2.id(), s1.id()]);
    expect(context.state.selection.map((node) => node.id())).toEqual([g1.id(), g2.id(), s1.id()]);

    fireKeydown(context, { key: "Backspace" });
    await flushCanvasEffects();

    expect(context.state.selection).toEqual([]);
    expect(harness.staticForegroundLayer.findOne("#1")).toBeFalsy();
    expect(harness.staticForegroundLayer.findOne("#2")).toBeFalsy();
    expect(harness.staticForegroundLayer.findOne("#3")).toBeFalsy();
    expect(harness.staticForegroundLayer.findOne("#" + g1.id())).toBeFalsy();
    expect(getDocIds(docHandle)).toEqual({ groupIds: [], elementIds: [] });

    context.history.undo();
    await flushCanvasEffects();

    expect(harness.staticForegroundLayer.findOne("#1")).toBeTruthy();
    expect(harness.staticForegroundLayer.findOne("#2")).toBeTruthy();
    expect(harness.staticForegroundLayer.findOne("#3")).toBeTruthy();
    expect(harness.staticForegroundLayer.findOne("#" + g1.id())).toBeTruthy();
    expect(getDocIds(docHandle)).toEqual({
      groupIds: [g1.id(), g2.id()].sort(),
      elementIds: ["1", "2", "3"],
    });

    context.history.redo();
    await flushCanvasEffects();

    expect(harness.staticForegroundLayer.findOne("#1")).toBeFalsy();
    expect(harness.staticForegroundLayer.findOne("#2")).toBeFalsy();
    expect(harness.staticForegroundLayer.findOne("#3")).toBeFalsy();
    expect(harness.staticForegroundLayer.findOne("#" + g1.id())).toBeFalsy();
    expect(getDocIds(docHandle)).toEqual({ groupIds: [], elementIds: [] });

    harness.destroy();
  });

  test("scene3: pointerdown focuses the clicked node and empty canvas clears focus", async () => {
    const { harness, context, selectionProbePlugin, g1 } = await createTopLevelSelectionSceneHarness();

    g1.fire(
      "pointerdown",
      {
        evt: new MouseEvent("pointerdown", { bubbles: true, button: 0 }),
      },
      true,
    );
    await flushCanvasEffects();

    expect(selectionProbePlugin.observedFocusedId).toBe(g1.id());

    const stageEvent = createStagePointerEvent(harness.stage, { x: 10, y: 10, type: "pointerdown" });
    harness.stage.setPointersPositions(stageEvent);
    context.hooks.pointerDown.call({ evt: stageEvent, target: harness.stage } as any);
    await flushCanvasEffects();

    expect(selectionProbePlugin.observedFocusedId).toBeNull();

    harness.destroy();
  });

  test("delete: Backspace removes a grouped text+rect subtree and is ignored while typing", async () => {
    const { harness, context, docHandle, group, text, rect } = await createDeleteGroupWithTextHarness();

    text.fire("pointerdown", { evt: new MouseEvent("pointerdown", { bubbles: true, button: 0 }) }, true);
    await flushCanvasEffects();

    expect(context.state.selection.map((node) => node.id())).toEqual([group.id()]);
    expect(getDocIds(docHandle)).toEqual({ groupIds: [group.id()], elementIds: [rect.id(), text.id()].sort() });

    const input = document.createElement("input");
    context.stage.container().appendChild(input);
    fireKeydown(context, { key: "Backspace", target: input });
    await flushCanvasEffects();

    expect(context.state.selection.map((node) => node.id())).toEqual([group.id()]);
    expect(harness.staticForegroundLayer.findOne("#" + group.id())).toBeTruthy();
    expect(getDocIds(docHandle)).toEqual({ groupIds: [group.id()], elementIds: [rect.id(), text.id()].sort() });

    input.remove();

    fireKeydown(context, { key: "Backspace" });
    await flushCanvasEffects();

    expect(context.state.selection).toEqual([]);
    expect(harness.staticForegroundLayer.findOne("#" + group.id())).toBeFalsy();
    expect(harness.staticForegroundLayer.findOne("#" + rect.id())).toBeFalsy();
    expect(harness.staticForegroundLayer.findOne("#" + text.id())).toBeFalsy();
    expect(getDocIds(docHandle)).toEqual({ groupIds: [], elementIds: [] });

    harness.destroy();
  });

  test("delete: Backspace on a rect also deletes its attached inline text", async () => {
    const { harness, context, docHandle, rect, attachedText } = await createAttachedRectTextDeleteHarness();

    expect(getDocIds(docHandle)).toEqual({ groupIds: [], elementIds: [attachedText.id(), rect.id()].sort() });

    context.setState("selection", [rect]);
    await flushCanvasEffects();

    fireKeydown(context, { key: "Backspace" });
    await flushCanvasEffects();

    expect(context.state.selection).toEqual([]);
    expect(harness.staticForegroundLayer.findOne("#" + rect.id())).toBeFalsy();
    expect(harness.staticForegroundLayer.findOne("#" + attachedText.id())).toBeFalsy();
    expect(getDocIds(docHandle)).toEqual({ groupIds: [], elementIds: [] });

    harness.destroy();
  });
});
