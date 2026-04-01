import Konva from "konva";
import type { TElement } from "@vibecanvas/shell/automerge/index";
import { describe, expect, test } from "vitest";
import { PenPlugin, SceneHydratorPlugin, type IPluginContext } from "../../../src/plugins";
import { createPenDataFromStrokePoints } from "../../../src/plugins/shared/pen.math";
import { createCanvasTestHarness, createMockDocHandle, flushCanvasEffects } from "../../test-setup";

function createPenElement(id: string): TElement {
  const penData = createPenDataFromStrokePoints([
    { x: 120, y: 80, pressure: 0.5 },
    { x: 150, y: 100, pressure: 0.55 },
    { x: 185, y: 110, pressure: 0.6 },
    { x: 220, y: 135, pressure: 0.5 },
  ]);

  if (!penData) {
    throw new Error("Failed to create pen data for zoom rehydrate test");
  }

  return {
    id,
    x: penData.x,
    y: penData.y,
    rotation: 0,
    bindings: [],
    createdAt: 1,
    updatedAt: 1,
    locked: false,
    parentGroupId: null,
    zIndex: "",
    style: {
      backgroundColor: "#0f172a",
      opacity: 0.92,
      strokeWidth: 7,
    },
    data: {
      type: "pen",
      points: penData.points,
      pressures: penData.pressures,
      simulatePressure: penData.simulatePressure,
    },
  };
}

describe("PenPlugin - zoom rehydrate", () => {
  test("dragging a pen stroke after zooming should rehydrate at the same world coordinates", async () => {
    let context!: IPluginContext;
    const penId = "pen-zoom-rehydrate";
    const docHandle = createMockDocHandle({
      elements: {
        [penId]: createPenElement(penId),
      },
    });

    const firstHarness = await createCanvasTestHarness({
      docHandle,
      plugins: [new PenPlugin(), new SceneHydratorPlugin()],
      initializeScene(pluginContext) {
        context = pluginContext;
      },
    });

    const pen = firstHarness.staticForegroundLayer.findOne<Konva.Path>(`#${penId}`);
    expect(pen).toBeTruthy();

    context.camera.zoomAtScreenPoint(0.5, { x: 400, y: 300 });
    context.hooks.cameraChange.call();
    await flushCanvasEffects();

    pen!.fire("dragstart", {
      target: pen,
      currentTarget: pen,
      evt: new MouseEvent("dragstart", { bubbles: true }),
    });
    pen!.setAbsolutePosition({ x: 0, y: pen!.absolutePosition().y });
    pen!.fire("dragmove", {
      target: pen,
      currentTarget: pen,
      evt: new MouseEvent("dragmove", { bubbles: true }),
    });
    pen!.fire("dragend", {
      target: pen,
      currentTarget: pen,
      evt: new MouseEvent("dragend", { bubbles: true }),
    });
    await flushCanvasEffects();

    const draggedWorldX = pen!.x();
    const draggedWorldY = pen!.y();

    expect(draggedWorldX).toBeLessThan(0);
    expect(pen!.absolutePosition().x).toBeCloseTo(0, 8);

    firstHarness.destroy();

    const secondHarness = await createCanvasTestHarness({
      docHandle,
      plugins: [new PenPlugin(), new SceneHydratorPlugin()],
    });

    const rehydratedPen = secondHarness.staticForegroundLayer.findOne<Konva.Path>(`#${penId}`);
    expect(rehydratedPen).toBeTruthy();

    expect(rehydratedPen!.x()).toBeCloseTo(draggedWorldX, 8);
    expect(rehydratedPen!.y()).toBeCloseTo(draggedWorldY, 8);
    expect(rehydratedPen!.absolutePosition().x).toBeCloseTo(draggedWorldX, 8);

    secondHarness.destroy();
  });
});
