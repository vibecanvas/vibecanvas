import Konva from "konva";
import { describe, expect, test } from "vitest";
import { GroupPlugin } from "../../src/plugins/Group.plugin";
import type { IPluginContext } from "../../src/plugins/interface";
import { createCanvasTestHarness } from "../test-setup";

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

    const harness = await createCanvasTestHarness({
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

    expect(group).toBeInstanceOf(Konva.Group);
    expect(rect1!.getParent()).toBe(group);
    expect(rect2!.getParent()).toBe(group);
    expectPointCloseTo(rect1!.getAbsolutePosition(), rect1AbsoluteBefore);
    expectPointCloseTo(rect2!.getAbsolutePosition(), rect2AbsoluteBefore);

    harness.destroy();
  });
});
