import Konva from "konva";
import type { DocHandle } from "@automerge/automerge-repo";
import type { TCanvasDoc } from "@vibecanvas/service-automerge/types/canvas-doc";
import { describe, expect, test } from "vitest";
import { GroupPlugin, RenderOrderPlugin, SelectPlugin, Shape2dPlugin, type IPluginContext } from "../../../src/plugins";
import { createCanvasTestHarness, createMockDocHandle, exportStageSnapshot, flushCanvasEffects } from "../../test-setup";
import { initializeScene03TopLevelMixedSelection } from "../../scenarios/03-top-level-mixed-selection";

function expectPointCloseTo(
  actual: { x: number; y: number },
  expected: { x: number; y: number },
) {
  expect(actual.x).toBeCloseTo(expected.x, 8);
  expect(actual.y).toBeCloseTo(expected.y, 8);
}

function altDragGroup(group: Konva.Group, args: { deltaX: number; deltaY?: number }) {
  const beforeNodeIds = new Set(
    group.getStage()?.getLayers().flatMap((layer) => layer.getChildren()).map((child) => child._id) ?? [],
  );

  group.fire("dragstart", {
    target: group,
    currentTarget: group,
    evt: new MouseEvent("dragstart", { bubbles: true, altKey: true }),
  });

  const previewClone = group.getStage()?.getLayers()
    .flatMap((layer) => layer.getChildren())
    .find((child) => !beforeNodeIds.has(child._id) && child instanceof Konva.Group) as Konva.Group | undefined;

  if (!previewClone) throw new Error("Expected preview clone after alt-drag start");

  const beforePos = previewClone.absolutePosition();
  previewClone.setAbsolutePosition({
    x: beforePos.x + args.deltaX,
    y: beforePos.y + (args.deltaY ?? 0),
  });
  previewClone.fire("dragend", {
    target: previewClone,
    currentTarget: previewClone,
    evt: new MouseEvent("dragend", { bubbles: true, altKey: true }),
  });
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

  test("grouping preserves the grouped selection stack slot instead of moving group to front", async () => {
    let pluginContext!: IPluginContext;
    const harness = await createCanvasTestHarness({
      plugins: [new RenderOrderPlugin(), new Shape2dPlugin(), new GroupPlugin()],
      initializeScene(context) {
        pluginContext = context;

        const rectA = Shape2dPlugin.createRectFromElement({
          id: "rect-a",
          x: 10,
          y: 10,
          rotation: 0,
          bindings: [],
          createdAt: 1,
          locked: false,
          parentGroupId: null,
          updatedAt: 1,
          zIndex: "z00000000",
          data: { type: "rect", w: 40, h: 40 },
          style: { backgroundColor: "red" },
        });
        const rectB = Shape2dPlugin.createRectFromElement({
          id: "rect-b",
          x: 70,
          y: 10,
          rotation: 0,
          bindings: [],
          createdAt: 2,
          locked: false,
          parentGroupId: null,
          updatedAt: 2,
          zIndex: "z00000001",
          data: { type: "rect", w: 40, h: 40 },
          style: { backgroundColor: "green" },
        });
        const rectC = Shape2dPlugin.createRectFromElement({
          id: "rect-c",
          x: 130,
          y: 10,
          rotation: 0,
          bindings: [],
          createdAt: 3,
          locked: false,
          parentGroupId: null,
          updatedAt: 3,
          zIndex: "z00000002",
          data: { type: "rect", w: 40, h: 40 },
          style: { backgroundColor: "blue" },
        });
        const rectD = Shape2dPlugin.createRectFromElement({
          id: "rect-d",
          x: 190,
          y: 10,
          rotation: 0,
          bindings: [],
          createdAt: 4,
          locked: false,
          parentGroupId: null,
          updatedAt: 4,
          zIndex: "z00000003",
          data: { type: "rect", w: 40, h: 40 },
          style: { backgroundColor: "yellow" },
        });

        [rectA, rectB, rectC, rectD].forEach((rect) => {
          Shape2dPlugin.setupShapeListeners(context, rect);
          rect.setDraggable(true);
          context.staticForegroundLayer.add(rect);
        });
        context.capabilities.renderOrder?.sortChildren(context.staticForegroundLayer);
      },
    });

    const rectB = harness.staticForegroundLayer.findOne<Konva.Rect>("#rect-b")!;
    const rectC = harness.staticForegroundLayer.findOne<Konva.Rect>("#rect-c")!;

    const group = GroupPlugin.group(pluginContext, [rectB, rectC]);
    const orderedIds = harness.staticForegroundLayer.getChildren()
      .filter((node) => node instanceof Konva.Group || node instanceof Konva.Shape)
      .map((node) => node.id());

    expect(orderedIds).toEqual(["rect-a", group.id(), "rect-d"]);

    harness.destroy();
  });

  test("ungrouping preserves children stack slot instead of moving them to front", async () => {
    let pluginContext!: IPluginContext;
    let group!: Konva.Group;
    const harness = await createCanvasTestHarness({
      plugins: [new RenderOrderPlugin(), new Shape2dPlugin(), new GroupPlugin()],
      initializeScene(context) {
        pluginContext = context;

        const rectA = Shape2dPlugin.createRectFromElement({
          id: "rect-a",
          x: 10,
          y: 10,
          rotation: 0,
          bindings: [],
          createdAt: 1,
          locked: false,
          parentGroupId: null,
          updatedAt: 1,
          zIndex: "z00000000",
          data: { type: "rect", w: 40, h: 40 },
          style: { backgroundColor: "red" },
        });
        const rectB = Shape2dPlugin.createRectFromElement({
          id: "rect-b",
          x: 70,
          y: 10,
          rotation: 0,
          bindings: [],
          createdAt: 2,
          locked: false,
          parentGroupId: null,
          updatedAt: 2,
          zIndex: "z00000001",
          data: { type: "rect", w: 40, h: 40 },
          style: { backgroundColor: "green" },
        });
        const rectC = Shape2dPlugin.createRectFromElement({
          id: "rect-c",
          x: 130,
          y: 10,
          rotation: 0,
          bindings: [],
          createdAt: 3,
          locked: false,
          parentGroupId: null,
          updatedAt: 3,
          zIndex: "z00000002",
          data: { type: "rect", w: 40, h: 40 },
          style: { backgroundColor: "blue" },
        });
        const rectD = Shape2dPlugin.createRectFromElement({
          id: "rect-d",
          x: 190,
          y: 10,
          rotation: 0,
          bindings: [],
          createdAt: 4,
          locked: false,
          parentGroupId: null,
          updatedAt: 4,
          zIndex: "z00000003",
          data: { type: "rect", w: 40, h: 40 },
          style: { backgroundColor: "yellow" },
        });

        [rectA, rectB, rectC, rectD].forEach((rect) => {
          Shape2dPlugin.setupShapeListeners(context, rect);
          rect.setDraggable(true);
          context.staticForegroundLayer.add(rect);
        });
        context.capabilities.renderOrder?.sortChildren(context.staticForegroundLayer);
        group = GroupPlugin.group(context, [rectB, rectC]);
      },
    });

    GroupPlugin.ungroup(pluginContext, group);
    const orderedIds = harness.staticForegroundLayer.getChildren()
      .filter((node) => node instanceof Konva.Group || node instanceof Konva.Shape)
      .map((node) => node.id());

    expect(orderedIds).toEqual(["rect-a", "rect-b", "rect-c", "rect-d"]);

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

describe("GroupPlugin – clone drag", () => {
  async function createMixedMultiSelectCloneHarness() {
    let pluginContext!: IPluginContext;
    const groupPlugin = new GroupPlugin();
    let g1!: Konva.Group;
    let s4!: Konva.Rect;

    const harness = await createCanvasTestHarness({
      plugins: [new SelectPlugin(), new Shape2dPlugin(), groupPlugin],
      initializeScene: (context) => {
        pluginContext = context;
        const scene = initializeScene03TopLevelMixedSelection({ context, groupPlugin });
        g1 = scene.g1;
        s4 = scene.s4;
      },
    });

    return { harness, pluginContext, g1, s4 };
  }

  async function createCloneHarness() {
    let pluginContext!: IPluginContext;
    const groupPlugin = new GroupPlugin();
    let g1!: Konva.Group;

    const harness = await createCanvasTestHarness({
      plugins: [new SelectPlugin(), new Shape2dPlugin(), groupPlugin],
      initializeScene: (context) => {
        pluginContext = context;
        const rect1 = new Konva.Rect({ id: "rect-a", x: 40, y: 60, width: 80, height: 50, fill: "red" });
        const rect2 = new Konva.Rect({ id: "rect-b", x: 150, y: 90, width: 90, height: 60, fill: "blue" });
        context.staticForegroundLayer.add(rect1);
        context.staticForegroundLayer.add(rect2);
        g1 = GroupPlugin.group(context, [rect1, rect2]);
        groupPlugin.setupGroupListeners(context, g1);
      },
    });

    return { harness, pluginContext, g1 };
  }

  test("alt-dragging a cloned group adds exactly one more group", async () => {
    const { harness, pluginContext, g1 } = await createCloneHarness();

    pluginContext.setState("selection", [g1]);
    await flushCanvasEffects();
    const originalPosition = { ...g1.absolutePosition() };

    altDragGroup(g1, { deltaX: 80, deltaY: 10 });
    await flushCanvasEffects();

    expect(g1.absolutePosition()).toEqual(originalPosition);

    const firstClone = (harness.staticForegroundLayer.find((node: any) => node instanceof Konva.Group) as Konva.Group[])
      .find((group) => group.id() !== g1.id())!;

    pluginContext.setState("selection", [firstClone]);
    await flushCanvasEffects();

    altDragGroup(firstClone, { deltaX: 70, deltaY: 15 });
    await flushCanvasEffects();

    const groups = harness.staticForegroundLayer.find((node: any) => node instanceof Konva.Group) as Konva.Group[];
    expect(groups).toHaveLength(3);
    expect(new Set(groups.map((group) => group.id())).size).toBe(3);

    harness.destroy();
  });

  test("dragging a cloned group updates its boundary box during dragmove", async () => {
    const { harness, pluginContext, g1 } = await createCloneHarness();

    pluginContext.setState("selection", [g1]);
    await flushCanvasEffects();

    altDragGroup(g1, { deltaX: 80, deltaY: 10 });
    await flushCanvasEffects();

    const firstClone = (harness.staticForegroundLayer.find((node: any) => node instanceof Konva.Group) as Konva.Group[])
      .find((group) => group.id() !== g1.id())!;

    pluginContext.setState("selection", [firstClone]);
    await flushCanvasEffects();

    const boundary = harness.dynamicLayer.findOne((node: Konva.Node) => {
      return node instanceof Konva.Rect && node.name() === `group-boundary:${firstClone.id()}`;
    }) as Konva.Rect | null;

    expect(boundary).toBeTruthy();
    const before = boundary!.position();

    firstClone.fire("dragstart", {
      target: firstClone,
      currentTarget: firstClone,
      evt: new MouseEvent("dragstart", { bubbles: true }),
    });

    firstClone.setAbsolutePosition({ x: firstClone.absolutePosition().x + 60, y: firstClone.absolutePosition().y + 15 });
    firstClone.fire("dragmove", {
      target: firstClone,
      currentTarget: firstClone,
      evt: new MouseEvent("dragmove", { bubbles: true }),
    });

    const after = boundary!.position();
    expect(after.x).not.toBeCloseTo(before.x, 8);
    expect(after.y).not.toBeCloseTo(before.y, 8);

    harness.destroy();
  });

  test("alt-dragging one node in a mixed top-level multi-selection should clone all selected roots", async () => {
    const { harness, pluginContext, g1, s4 } = await createMixedMultiSelectCloneHarness();

    pluginContext.setState("selection", [g1, s4]);
    await flushCanvasEffects();

    const groupsBefore = harness.staticForegroundLayer.find((node: any) => node instanceof Konva.Group) as Konva.Group[];
    const rectsBefore = harness.staticForegroundLayer.find((node: any) => node instanceof Konva.Rect) as Konva.Rect[];

    const beforeNodeIds = new Set(
      harness.stage.getLayers().flatMap((layer) => layer.getChildren()).map((child) => child._id),
    );

    s4.fire("dragstart", {
      target: s4,
      currentTarget: s4,
      evt: new MouseEvent("dragstart", { bubbles: true, altKey: true }),
    });

    const previewClone = harness.stage.getLayers()
      .flatMap((layer) => layer.getChildren())
      .find((child) => !beforeNodeIds.has(child._id) && child instanceof Konva.Rect) as Konva.Rect | undefined;

    if (!previewClone) {
      throw new Error("Expected preview clone after alt-drag start");
    }

    const beforePos = previewClone.absolutePosition();
    previewClone.setAbsolutePosition({ x: beforePos.x + 80, y: beforePos.y + 20 });
    previewClone.fire("dragend", {
      target: previewClone,
      currentTarget: previewClone,
      evt: new MouseEvent("dragend", { bubbles: true, altKey: true }),
    });
    await flushCanvasEffects();

    const groupsAfter = harness.staticForegroundLayer.find((node: any) => node instanceof Konva.Group) as Konva.Group[];
    const rectsAfter = harness.staticForegroundLayer.find((node: any) => node instanceof Konva.Rect) as Konva.Rect[];

    expect(groupsAfter).toHaveLength(groupsBefore.length + 1);
    expect(rectsAfter).toHaveLength(rectsBefore.length + 3);

    harness.destroy();
  });
});
