import Konva from "konva";
import { describe, expect, test } from "vitest";
import { CanvasMode } from "../../../src/services/selection/CONSTANTS";
import { createNewCanvasHarness, flushCanvasEffects } from "../../new-test-setup";

async function createHandHarness() {
  const harness = await createNewCanvasHarness();
  const editor = harness.runtime.services.require("editor");
  const selection = harness.runtime.services.require("selection");
  const camera = harness.runtime.services.require("camera");

  const shape = new Konva.Rect({
    id: "shape-1",
    x: 100,
    y: 100,
    width: 40,
    height: 40,
    draggable: true,
  });
  harness.staticForegroundLayer.add(shape);
  harness.staticForegroundLayer.batchDraw();

  const handLayer = Array.from(harness.stage.container().querySelectorAll("div.absolute.inset-0"))
    .find((candidate) => (candidate as HTMLDivElement).style.touchAction === "none") as HTMLDivElement | null;
  expect(handLayer).toBeTruthy();

  return {
    ...harness,
    editor,
    selection,
    camera,
    handLayer: handLayer!,
    shape,
  };
}

function dispatchPointerEvent(target: EventTarget, type: string, init: PointerEventInit) {
  const event = new PointerEvent(type, { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

describe("new CameraControl plugin", () => {
  test("hand drag pans camera and resets drag state on release", async () => {
    const { destroy, editor, selection, camera, handLayer } = await createHandHarness();

    editor.setActiveTool("hand");
    await flushCanvasEffects();

    expect(selection.mode).toBe(CanvasMode.HAND);
    expect(handLayer.style.display).toBe("block");
    expect(handLayer.style.pointerEvents).toBe("auto");
    expect(handLayer.style.cursor).toBe("grab");

    dispatchPointerEvent(handLayer, "pointerdown", { pointerId: 1, clientX: 320, clientY: 220 });
    expect(handLayer.style.cursor).toBe("grabbing");

    dispatchPointerEvent(handLayer, "pointermove", { pointerId: 1, clientX: 360, clientY: 250 });

    expect(camera.x).toBe(40);
    expect(camera.y).toBe(30);

    dispatchPointerEvent(handLayer, "pointerup", { pointerId: 1, clientX: 360, clientY: 250 });
    expect(handLayer.style.cursor).toBe("grab");

    dispatchPointerEvent(handLayer, "pointermove", { pointerId: 1, clientX: 410, clientY: 290 });
    expect(camera.x).toBe(40);
    expect(camera.y).toBe(30);

    await destroy();
  });

  test("hand layer blocks selection and shape drag interactions", async () => {
    const { destroy, editor, selection, camera, handLayer, shape } = await createHandHarness();

    editor.setActiveTool("hand");
    await flushCanvasEffects();

    const beforeShapePosition = { x: shape.x(), y: shape.y() };
    dispatchPointerEvent(handLayer, "pointerdown", { pointerId: 2, clientX: 500, clientY: 260 });
    dispatchPointerEvent(handLayer, "pointermove", { pointerId: 2, clientX: 530, clientY: 280 });
    dispatchPointerEvent(handLayer, "pointerup", { pointerId: 2, clientX: 530, clientY: 280 });

    expect(selection.selection).toHaveLength(0);
    expect({ x: shape.x(), y: shape.y() }).toEqual(beforeShapePosition);
    expect(camera.x).toBe(30);
    expect(camera.y).toBe(20);

    await destroy();
  });

  test("leaving hand mode mid-drag clears internal drag state", async () => {
    const { destroy, editor, selection, camera, handLayer } = await createHandHarness();

    editor.setActiveTool("hand");
    await flushCanvasEffects();

    dispatchPointerEvent(handLayer, "pointerdown", { pointerId: 3, clientX: 200, clientY: 180 });
    dispatchPointerEvent(handLayer, "pointermove", { pointerId: 3, clientX: 230, clientY: 210 });

    expect(selection.mode).toBe(CanvasMode.HAND);
    expect(camera.x).toBe(30);
    expect(camera.y).toBe(30);
    expect(handLayer.style.cursor).toBe("grabbing");

    editor.setActiveTool("select");
    await flushCanvasEffects();

    expect(selection.mode).toBe(CanvasMode.SELECT);
    expect(handLayer.style.display).toBe("none");
    expect(handLayer.style.pointerEvents).toBe("none");
    expect(handLayer.style.cursor).toBe("default");

    dispatchPointerEvent(handLayer, "pointermove", { pointerId: 3, clientX: 280, clientY: 260 });
    expect(camera.x).toBe(30);
    expect(camera.y).toBe(30);

    await destroy();
  });
});
