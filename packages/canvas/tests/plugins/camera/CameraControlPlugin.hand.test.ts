import Konva from "konva";
import { describe, expect, test } from "vitest";
import { CameraControlPlugin, GroupPlugin, SelectPlugin, Shape2dPlugin, TransformPlugin, type IPlugin, type IPluginContext } from "../../../src/plugins";
import { CanvasMode } from "../../../src/services/canvas/enum";
import { initializeScene03TopLevelMixedSelection } from "../../scenarios/03-top-level-mixed-selection";
import { createCanvasTestHarness, flushCanvasEffects } from "../../test-setup";

async function createHandHarness() {
  let context!: IPluginContext;
  const groupPlugin = new GroupPlugin();
  const plugins: IPlugin[] = [
    new CameraControlPlugin(),
    new SelectPlugin(),
    new TransformPlugin(),
    new Shape2dPlugin(),
    groupPlugin,
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

  const handLayer = harness.stage.container().querySelector("div.absolute.inset-0") as HTMLDivElement | null;
  const s4 = harness.staticForegroundLayer.findOne<Konva.Rect>("#4");

  expect(handLayer).toBeTruthy();
  expect(s4).toBeTruthy();

  return {
    harness,
    context,
    handLayer: handLayer!,
    s4: s4!,
  };
}

function dispatchPointerEvent(target: EventTarget, type: string, init: PointerEventInit) {
  const event = new PointerEvent(type, { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

describe("CameraControlPlugin hand tool", () => {
  test("hand drag pans camera and resets drag state on release", async () => {
    const { harness, context, handLayer } = await createHandHarness();

    context.setState("mode", CanvasMode.HAND);
    await flushCanvasEffects();

    expect(handLayer.style.display).toBe("block");
    expect(handLayer.style.pointerEvents).toBe("auto");
    expect(handLayer.style.cursor).toBe("grab");

    dispatchPointerEvent(handLayer, "pointerdown", { pointerId: 1, clientX: 320, clientY: 220 });
    expect(handLayer.style.cursor).toBe("grabbing");

    dispatchPointerEvent(handLayer, "pointermove", { pointerId: 1, clientX: 360, clientY: 250 });

    expect(context.camera.x).toBe(40);
    expect(context.camera.y).toBe(30);

    dispatchPointerEvent(handLayer, "pointerup", { pointerId: 1, clientX: 360, clientY: 250 });
    expect(handLayer.style.cursor).toBe("grab");

    dispatchPointerEvent(handLayer, "pointermove", { pointerId: 1, clientX: 410, clientY: 290 });
    expect(context.camera.x).toBe(40);
    expect(context.camera.y).toBe(30);

    harness.destroy();
  });

  test("hand layer blocks selection and shape drag interactions", async () => {
    const { harness, context, handLayer, s4 } = await createHandHarness();

    context.setState("mode", CanvasMode.HAND);
    await flushCanvasEffects();

    const beforeShapePosition = { x: s4.x(), y: s4.y() };
    dispatchPointerEvent(handLayer, "pointerdown", { pointerId: 2, clientX: 500, clientY: 260 });
    dispatchPointerEvent(handLayer, "pointermove", { pointerId: 2, clientX: 530, clientY: 280 });
    dispatchPointerEvent(handLayer, "pointerup", { pointerId: 2, clientX: 530, clientY: 280 });

    expect(context.state.selection).toHaveLength(0);
    expect({ x: s4.x(), y: s4.y() }).toEqual(beforeShapePosition);
    expect(context.camera.x).toBe(30);
    expect(context.camera.y).toBe(20);

    harness.destroy();
  });

  test("leaving hand mode mid-drag clears internal drag state", async () => {
    const { harness, context, handLayer } = await createHandHarness();

    context.setState("mode", CanvasMode.HAND);
    await flushCanvasEffects();

    dispatchPointerEvent(handLayer, "pointerdown", { pointerId: 3, clientX: 200, clientY: 180 });
    dispatchPointerEvent(handLayer, "pointermove", { pointerId: 3, clientX: 230, clientY: 210 });

    expect(context.camera.x).toBe(30);
    expect(context.camera.y).toBe(30);
    expect(handLayer.style.cursor).toBe("grabbing");

    context.setState("mode", CanvasMode.SELECT);
    await flushCanvasEffects();

    expect(handLayer.style.display).toBe("none");
    expect(handLayer.style.pointerEvents).toBe("none");
    expect(handLayer.style.cursor).toBe("default");

    dispatchPointerEvent(handLayer, "pointermove", { pointerId: 3, clientX: 280, clientY: 260 });
    expect(context.camera.x).toBe(30);
    expect(context.camera.y).toBe(30);

    harness.destroy();
  });
});
