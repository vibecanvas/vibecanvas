import Konva from "konva";
import { createEffect } from "solid-js";
import { describe, expect, test, vi } from "vitest";
import { GroupPlugin } from "../src/plugins/Group.plugin";
import type { IPlugin, IPluginContext } from "../src/plugins/interface";
import { SelectPlugin } from "../src/plugins/Select.plugin";
import { TransformPlugin } from "../src/plugins/Transform.plugin";
import { initializeScene01SelectOuterGroupFromChild } from "./scenarios/01-select-outer-group-from-child";
import { initializeScene02NestedGroupsLeafShapes } from "./scenarios/02-nested-groups-leaf-shapes";
import { initializeScene03TopLevelMixedSelection } from "./scenarios/03-top-level-mixed-selection";
import { createCanvasTestHarness, flushCanvasEffects } from "./test-setup";

class SelectionProbePlugin implements IPlugin {
  observedSelectionIds: string[] = [];

  apply(context: IPluginContext): void {
    context.hooks.init.tap(() => {
      createEffect(() => {
        this.observedSelectionIds = context.state.selection.map((node) => node.id());
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
      initializeScene03TopLevelMixedSelection({
        context,
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
    selectionProbePlugin,
    g1,
    g2,
    s4: s4!,
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
});
