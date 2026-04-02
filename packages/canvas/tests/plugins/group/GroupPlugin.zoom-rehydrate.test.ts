import Konva from "konva";
import { describe, expect, test } from "vitest";
import { GroupPlugin, RenderOrderPlugin, SceneHydratorPlugin, Shape2dPlugin, type IPluginContext } from "../../../src/plugins";
import { createCanvasTestHarness, createMockDocHandle, flushCanvasEffects } from "../../test-setup";

describe("GroupPlugin - zoom rehydrate", () => {
  test("dragging a group after zooming should rehydrate its children at the same world coordinates", async () => {
    let context!: IPluginContext;
    const groupId = "group-zoom-rehydrate";
    const childAId = "group-child-a";
    const childBId = "group-child-b";
    const docHandle = createMockDocHandle({
      groups: {
        [groupId]: {
          id: groupId,
          parentGroupId: null,
          zIndex: "z00000000",
          locked: false,
          createdAt: 1,
        },
      },
      elements: {
        [childAId]: {
          id: childAId,
          x: 120,
          y: 100,
          rotation: 0,
          bindings: [],
          createdAt: 1,
          locked: false,
          parentGroupId: groupId,
          updatedAt: 1,
          zIndex: "",
          data: { type: "rect", w: 100, h: 70 },
          style: { backgroundColor: "#ef4444", opacity: 1, strokeWidth: 0 },
        },
        [childBId]: {
          id: childBId,
          x: 260,
          y: 140,
          rotation: 0,
          bindings: [],
          createdAt: 1,
          locked: false,
          parentGroupId: groupId,
          updatedAt: 1,
          zIndex: "",
          data: { type: "rect", w: 120, h: 80 },
          style: { backgroundColor: "#22c55e", opacity: 1, strokeWidth: 0 },
        },
      },
    });

    const firstHarness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new Shape2dPlugin(), new GroupPlugin(), new SceneHydratorPlugin()],
      initializeScene(pluginContext) {
        context = pluginContext;
      },
    });

    const group = firstHarness.staticForegroundLayer.findOne<Konva.Group>(`#${groupId}`);
    const childA = firstHarness.staticForegroundLayer.findOne<Konva.Rect>(`#${childAId}`);
    const childB = firstHarness.staticForegroundLayer.findOne<Konva.Rect>(`#${childBId}`);
    expect(group).toBeTruthy();
    expect(childA).toBeTruthy();
    expect(childB).toBeTruthy();

    context.camera.zoomAtScreenPoint(0.5, { x: 400, y: 300 });
    context.hooks.cameraChange.call();
    await flushCanvasEffects();

    group!.fire("dragstart", {
      target: group,
      currentTarget: group,
      evt: new MouseEvent("dragstart", { bubbles: true }),
    });
    group!.setAbsolutePosition({ x: -100, y: group!.absolutePosition().y });
    group!.fire("dragmove", {
      target: group,
      currentTarget: group,
      evt: new MouseEvent("dragmove", { bubbles: true }),
    });
    group!.fire("dragend", {
      target: group,
      currentTarget: group,
      evt: new MouseEvent("dragend", { bubbles: true }),
    });
    await flushCanvasEffects();

    const draggedChildAWorldX = childA!.x();
    const draggedChildAWorldY = childA!.y();
    const draggedChildBWorldX = childB!.x();
    const draggedChildBWorldY = childB!.y();

    expect(group!.absolutePosition().x).toBeCloseTo(-100, 8);

    firstHarness.destroy();

    const secondHarness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new Shape2dPlugin(), new GroupPlugin(), new SceneHydratorPlugin()],
    });

    const rehydratedChildA = secondHarness.staticForegroundLayer.findOne<Konva.Rect>(`#${childAId}`);
    const rehydratedChildB = secondHarness.staticForegroundLayer.findOne<Konva.Rect>(`#${childBId}`);
    expect(rehydratedChildA).toBeTruthy();
    expect(rehydratedChildB).toBeTruthy();

    expect(rehydratedChildA!.x()).toBeCloseTo(draggedChildAWorldX, 8);
    expect(rehydratedChildA!.y()).toBeCloseTo(draggedChildAWorldY, 8);
    expect(rehydratedChildB!.x()).toBeCloseTo(draggedChildBWorldX, 8);
    expect(rehydratedChildB!.y()).toBeCloseTo(draggedChildBWorldY, 8);

    secondHarness.destroy();
  });
});
