import Konva from "konva";
import { describe, expect, test } from "vitest";
import { SceneHydratorPlugin } from "../../../src/plugins/SceneHydrator.plugin";
import { Shape2dPlugin } from "../../../src/plugins/Shape2d.plugin";
import type { IPluginContext } from "../../../src/plugins/interface";
import { createCanvasTestHarness, createMockDocHandle, flushCanvasEffects } from "../../test-setup";

describe("Shape2dPlugin - zoom rehydrate", () => {
  test("dragging a rect after zooming should rehydrate at the same world coordinates", async () => {
    let context!: IPluginContext;
    const rectId = "rect-zoom-rehydrate";
    const docHandle = createMockDocHandle({
      elements: {
        [rectId]: {
          id: rectId,
          x: 120,
          y: 100,
          rotation: 0,
          bindings: [],
          createdAt: 1,
          locked: false,
          parentGroupId: null,
          updatedAt: 1,
          zIndex: "",
          data: {
            type: "rect",
            w: 160,
            h: 100,
          },
          style: {
            backgroundColor: "#ef4444",
            opacity: 1,
            strokeWidth: 0,
          },
        },
      },
    });

    const firstHarness = await createCanvasTestHarness({
      docHandle,
      plugins: [new Shape2dPlugin(), new SceneHydratorPlugin()],
      initializeScene(pluginContext) {
        context = pluginContext;
      },
    });

    const rect = firstHarness.staticForegroundLayer.findOne<Konva.Rect>(`#${rectId}`);
    expect(rect).toBeTruthy();

    context.camera.zoomAtScreenPoint(0.5, { x: 400, y: 300 });
    context.hooks.cameraChange.call();
    await flushCanvasEffects();

    rect!.fire("dragstart", {
      target: rect,
      currentTarget: rect,
      evt: new MouseEvent("dragstart", { bubbles: true }),
    });
    rect!.setAbsolutePosition({ x: 0, y: rect!.absolutePosition().y });
    rect!.fire("dragmove", {
      target: rect,
      currentTarget: rect,
      evt: new MouseEvent("dragmove", { bubbles: true }),
    });
    rect!.fire("dragend", {
      target: rect,
      currentTarget: rect,
      evt: new MouseEvent("dragend", { bubbles: true }),
    });
    await flushCanvasEffects();

    const draggedWorldX = rect!.x();
    const draggedWorldY = rect!.y();

    expect(draggedWorldX).toBeLessThan(0);
    expect(rect!.absolutePosition().x).toBeCloseTo(0, 8);

    firstHarness.destroy();

    const secondHarness = await createCanvasTestHarness({
      docHandle,
      plugins: [new Shape2dPlugin(), new SceneHydratorPlugin()],
    });

    const rehydratedRect = secondHarness.staticForegroundLayer.findOne<Konva.Rect>(`#${rectId}`);
    expect(rehydratedRect).toBeTruthy();

    expect(rehydratedRect!.x()).toBeCloseTo(draggedWorldX, 8);
    expect(rehydratedRect!.y()).toBeCloseTo(draggedWorldY, 8);
    expect(rehydratedRect!.absolutePosition().x).toBeCloseTo(draggedWorldX, 8);

    secondHarness.destroy();
  });
});
