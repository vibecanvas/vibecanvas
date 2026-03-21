import Konva from "konva";
import type { DocHandle } from "@automerge/automerge-repo";
import type { TCanvasDoc } from "@vibecanvas/shell/automerge/index";
import { describe, expect, test } from "vitest";
import { GroupPlugin } from "../../src/plugins/Group.plugin";
import { SelectPlugin } from "../../src/plugins/Select.plugin";
import { Shape2dPlugin } from "../../src/plugins/Shape2d.plugin";
import type { IPluginContext } from "../../src/plugins/interface";
import { createCanvasTestHarness, createMockDocHandle, exportStageSnapshot, flushCanvasEffects } from "../test-setup";
import { initializeScene03TopLevelMixedSelection } from "../scenarios/03-top-level-mixed-selection";

function expectPointCloseTo(
  actual: { x: number; y: number },
  expected: { x: number; y: number },
) {
  expect(actual.x).toBeCloseTo(expected.x, 8);
  expect(actual.y).toBeCloseTo(expected.y, 8);
}

describe("GroupPlugin", () => {
  test("grouping preserves child absolute positions under camera pan and zoom", async () => {
    let pluginContext!: IPluginContext;
    const docHandle = createMockDocHandle() as DocHandle<TCanvasDoc>;

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new GroupPlugin()],
      initializeScene: (context) => {
        pluginContext = context;

        const rect1 = new Konva.Rect({
          id: "rect-1",
          x: 30,
          y: 40,
          width: 50,
          height: 40,
        });
        const rect2 = new Konva.Rect({
          id: "rect-2",
          x: 120,
          y: 90,
          width: 60,
          height: 30,
        });

        context.staticForegroundLayer.add(rect1);
        context.staticForegroundLayer.add(rect2);
        context.camera.pan(-120, -75);
        context.camera.zoomAtScreenPoint(1.35, { x: 250, y: 180 });
      },
    });

    const rect1 = harness.staticForegroundLayer.findOne<Konva.Rect>("#rect-1");
    const rect2 = harness.staticForegroundLayer.findOne<Konva.Rect>("#rect-2");

    expect(rect1).toBeTruthy();
    expect(rect2).toBeTruthy();

    const rect1AbsoluteBefore = rect1!.getAbsolutePosition();
    const rect2AbsoluteBefore = rect2!.getAbsolutePosition();

    const group = GroupPlugin.group(pluginContext, [rect1!, rect2!]);
    const doc = docHandle.doc();

    expect(group).toBeInstanceOf(Konva.Group);
    expect(rect1!.getParent()).toBe(group);
    expect(rect2!.getParent()).toBe(group);
    expectPointCloseTo(rect1!.getAbsolutePosition(), rect1AbsoluteBefore);
    expectPointCloseTo(rect2!.getAbsolutePosition(), rect2AbsoluteBefore);
    expect(doc.groups[group.id()]).toBeTruthy();
    expect("x" in doc.groups[group.id()]).toBe(false);
    expect("y" in doc.groups[group.id()]).toBe(false);
    expect(doc.elements[rect1!.id()].parentGroupId).toBe(group.id());
    expect(doc.elements[rect2!.id()].parentGroupId).toBe(group.id());

    harness.destroy();
  });

  test("ungrouping preserves child absolute positions and clears parentGroupId", async () => {
    let pluginContext!: IPluginContext;
    const docHandle = createMockDocHandle() as DocHandle<TCanvasDoc>;

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new GroupPlugin()],
      initializeScene: (context) => {
        pluginContext = context;

        const rect1 = new Konva.Rect({
          id: "rect-1",
          x: 30,
          y: 40,
          width: 50,
          height: 40,
        });
        const rect2 = new Konva.Rect({
          id: "rect-2",
          x: 120,
          y: 90,
          width: 60,
          height: 30,
        });

        context.staticForegroundLayer.add(rect1);
        context.staticForegroundLayer.add(rect2);
        context.camera.pan(-120, -75);
        context.camera.zoomAtScreenPoint(1.35, { x: 250, y: 180 });
      },
    });

    const rect1 = harness.staticForegroundLayer.findOne<Konva.Rect>("#rect-1");
    const rect2 = harness.staticForegroundLayer.findOne<Konva.Rect>("#rect-2");

    expect(rect1).toBeTruthy();
    expect(rect2).toBeTruthy();

    const group = GroupPlugin.group(pluginContext, [rect1!, rect2!]);
    const rect1AbsoluteBeforeUngroup = rect1!.getAbsolutePosition();
    const rect2AbsoluteBeforeUngroup = rect2!.getAbsolutePosition();

    const ungroupedChildren = GroupPlugin.ungroup(pluginContext, group);
    const doc = docHandle.doc();

    expect(ungroupedChildren).toHaveLength(2);
    expect(rect1!.getParent()).toBe(harness.staticForegroundLayer);
    expect(rect2!.getParent()).toBe(harness.staticForegroundLayer);
    expectPointCloseTo(rect1!.getAbsolutePosition(), rect1AbsoluteBeforeUngroup);
    expectPointCloseTo(rect2!.getAbsolutePosition(), rect2AbsoluteBeforeUngroup);
    expect(doc.groups[group.id()]).toBeUndefined();
    expect(doc.elements[rect1!.id()].parentGroupId).toBeNull();
    expect(doc.elements[rect2!.id()].parentGroupId).toBeNull();

    harness.destroy();
  });

  test("group action can be undone and redone", async () => {
    let pluginContext!: IPluginContext;
    const docHandle = createMockDocHandle() as DocHandle<TCanvasDoc>;

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new GroupPlugin()],
      initializeScene: (context) => {
        pluginContext = context;

        const rect1 = new Konva.Rect({ id: "rect-1", x: 30, y: 40, width: 50, height: 40 });
        const rect2 = new Konva.Rect({ id: "rect-2", x: 120, y: 90, width: 60, height: 30 });
        context.staticForegroundLayer.add(rect1);
        context.staticForegroundLayer.add(rect2);
      },
    });

    const rect1 = harness.staticForegroundLayer.findOne<Konva.Rect>("#rect-1")!;
    const rect2 = harness.staticForegroundLayer.findOne<Konva.Rect>("#rect-2")!;

    const group = GroupPlugin.group(pluginContext, [rect1, rect2]);
    expect(pluginContext.history.canUndo()).toBe(true);
    expect(rect1.getParent()).toBe(group);
    expect(rect2.getParent()).toBe(group);
    expect(docHandle.doc().groups[group.id()]).toBeTruthy();

    pluginContext.history.undo();

    expect(rect1.getParent()).toBe(harness.staticForegroundLayer);
    expect(rect2.getParent()).toBe(harness.staticForegroundLayer);
    expect(docHandle.doc().groups[group.id()]).toBeUndefined();
    expect(docHandle.doc().elements[rect1.id()].parentGroupId).toBeNull();
    expect(docHandle.doc().elements[rect2.id()].parentGroupId).toBeNull();

    pluginContext.history.redo();

    const regrouped = harness.staticForegroundLayer.findOne<Konva.Group>((node: any) => node instanceof Konva.Group && node.id() === group.id());
    expect(regrouped).toBeTruthy();
    expect(rect1.getParent()).toBe(regrouped);
    expect(rect2.getParent()).toBe(regrouped);
    expect(docHandle.doc().groups[group.id()]).toBeTruthy();
    expect(docHandle.doc().elements[rect1.id()].parentGroupId).toBe(group.id());
    expect(docHandle.doc().elements[rect2.id()].parentGroupId).toBe(group.id());

    harness.destroy();
  });

  test("ungroup action can be undone and redone", async () => {
    let pluginContext!: IPluginContext;
    const docHandle = createMockDocHandle() as DocHandle<TCanvasDoc>;

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new GroupPlugin()],
      initializeScene: (context) => {
        pluginContext = context;

        const rect1 = new Konva.Rect({ id: "rect-1", x: 30, y: 40, width: 50, height: 40 });
        const rect2 = new Konva.Rect({ id: "rect-2", x: 120, y: 90, width: 60, height: 30 });
        context.staticForegroundLayer.add(rect1);
        context.staticForegroundLayer.add(rect2);
      },
    });

    const rect1 = harness.staticForegroundLayer.findOne<Konva.Rect>("#rect-1")!;
    const rect2 = harness.staticForegroundLayer.findOne<Konva.Rect>("#rect-2")!;
    const group = GroupPlugin.group(pluginContext, [rect1, rect2]);
    GroupPlugin.ungroup(pluginContext, group);

    expect(rect1.getParent()).toBe(harness.staticForegroundLayer);
    expect(rect2.getParent()).toBe(harness.staticForegroundLayer);
    expect(docHandle.doc().groups[group.id()]).toBeUndefined();

    pluginContext.history.undo();

    const regrouped = harness.staticForegroundLayer.findOne<Konva.Group>((node: any) => node instanceof Konva.Group && node.id() === group.id());
    expect(regrouped).toBeTruthy();
    expect(rect1.getParent()).toBe(regrouped);
    expect(rect2.getParent()).toBe(regrouped);
    expect(docHandle.doc().groups[group.id()]).toBeTruthy();

    pluginContext.history.redo();

    expect(rect1.getParent()).toBe(harness.staticForegroundLayer);
    expect(rect2.getParent()).toBe(harness.staticForegroundLayer);
    expect(docHandle.doc().groups[group.id()]).toBeUndefined();
    expect(docHandle.doc().elements[rect1.id()].parentGroupId).toBeNull();
    expect(docHandle.doc().elements[rect2.id()].parentGroupId).toBeNull();

    harness.destroy();
  });
});

describe("GroupPlugin – multi-select drag", () => {
  const snapshotDir = "tests/artifacts/group-plugin/multiselect-drag";

  async function createMultiSelectHarness() {
    let pluginContext!: IPluginContext;
    const groupPlugin = new GroupPlugin();
    let g1!: Konva.Group;
    let g2!: Konva.Group;
    let s4!: Konva.Rect;

    const harness = await createCanvasTestHarness({
      plugins: [new SelectPlugin(), new Shape2dPlugin(), groupPlugin],
      initializeScene: (context) => {
        pluginContext = context;
        const scene = initializeScene03TopLevelMixedSelection({ context, groupPlugin });
        g1 = scene.g1;
        g2 = scene.g2;
        s4 = scene.s4;
      },
    });

    pluginContext.history.clear();
    return { harness, pluginContext, g1, g2, s4 };
  }

  test("pointerdown on already-selected node must not collapse multi-selection", async () => {
    const { harness, pluginContext, g1, s4 } = await createMultiSelectHarness();

    pluginContext.setState("selection", [g1, s4]);
    await flushCanvasEffects();

    await exportStageSnapshot({
      stage: harness.stage,
      label: "multi-select g1+s4 – before pointerdown on g1",
      relativeFilePath: `${snapshotDir}/01-multi-select-before-pointerdown.png`,
      waitMs: 60,
    });

    // BUG: firing pointerdown on g1 collapses selection to [g1] only
    g1.fire("pointerdown", {
      target: g1,
      currentTarget: g1,
      evt: new PointerEvent("pointerdown"),
    });

    await exportStageSnapshot({
      stage: harness.stage,
      label: "multi-select g1+s4 – after pointerdown on g1 (bug: selection collapsed)",
      relativeFilePath: `${snapshotDir}/02-after-pointerdown-on-g1.png`,
      waitMs: 60,
    });

    // FAILS before fix: selection is collapsed to [g1] only
    expect(pluginContext.state.selection).toHaveLength(2);
    expect(pluginContext.state.selection).toContain(g1);
    expect(pluginContext.state.selection).toContain(s4);

    harness.destroy();
  });

  test("dragging one selected node moves all selected nodes together and undo restores all", async () => {
    const { harness, pluginContext, g1, s4 } = await createMultiSelectHarness();

    pluginContext.setState("selection", [g1, s4]);
    await flushCanvasEffects();

    const g1StartPos = { ...g1.absolutePosition() };
    const s4StartPos = { ...s4.absolutePosition() };
    const deltaX = 90;

    await exportStageSnapshot({
      stage: harness.stage,
      label: "multi-drag – before drag",
      relativeFilePath: `${snapshotDir}/03-multi-drag-before.png`,
      waitMs: 60,
    });

    // Simulate dragging s4 (shape) — g1 (group) should follow
    s4.fire("dragstart", {
      target: s4,
      currentTarget: s4,
      evt: new MouseEvent("dragstart", { bubbles: true }),
    });

    s4.setAbsolutePosition({ x: s4StartPos.x + deltaX, y: s4StartPos.y });

    s4.fire("dragmove", {
      target: s4,
      currentTarget: s4,
      evt: new MouseEvent("dragmove", { bubbles: true }),
    });

    s4.fire("dragend", {
      target: s4,
      currentTarget: s4,
      evt: new MouseEvent("dragend", { bubbles: true }),
    });

    await exportStageSnapshot({
      stage: harness.stage,
      label: "multi-drag – after drag (s4 and g1 should both have moved)",
      relativeFilePath: `${snapshotDir}/04-multi-drag-after.png`,
      waitMs: 60,
    });

    // FAILS before drag-sync fix: g1 stays in place
    expect(s4.absolutePosition().x).toBeCloseTo(s4StartPos.x + deltaX, 2);
    expect(g1.absolutePosition().x).toBeCloseTo(g1StartPos.x + deltaX, 2);

    // Undo should restore both nodes
    pluginContext.history.undo();
    await flushCanvasEffects();

    await exportStageSnapshot({
      stage: harness.stage,
      label: "multi-drag – after undo (both s4 and g1 back to original)",
      relativeFilePath: `${snapshotDir}/05-multi-drag-undo.png`,
      waitMs: 60,
    });

    expect(s4.absolutePosition().x).toBeCloseTo(s4StartPos.x, 2);
    expect(g1.absolutePosition().x).toBeCloseTo(g1StartPos.x, 2);

    harness.destroy();
  });
});
