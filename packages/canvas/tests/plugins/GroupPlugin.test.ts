import Konva from "konva";
import type { DocHandle } from "@automerge/automerge-repo";
import type { TCanvasDoc } from "@vibecanvas/shell/automerge/index";
import { describe, expect, test } from "vitest";
import { GroupPlugin } from "../../src/plugins/Group.plugin";
import type { IPluginContext } from "../../src/plugins/interface";
import { createCanvasTestHarness, createMockDocHandle } from "../test-setup";

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
});
