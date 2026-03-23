import Konva from "konva";
import { describe, expect, test } from "vitest";
import { TextPlugin } from "../../../src/plugins/Text.plugin";
import type { IPluginContext } from "../../../src/plugins/interface";
import { CanvasMode } from "../../../src/services/canvas/enum";
import { CustomEvents } from "../../../src/custom-events";
import { createCanvasTestHarness, flushCanvasEffects } from "../../test-setup";

function firePointerUp(context: IPluginContext, x: number, y: number) {
  const layer = context.staticForegroundLayer;
  const originalGetPos = layer.getRelativePointerPosition.bind(layer);
  layer.getRelativePointerPosition = () => ({ x, y });

  context.hooks.pointerUp.call({
    target: context.stage,
    currentTarget: context.stage,
    evt: new PointerEvent("pointerup"),
    cancelBubble: false,
  } as unknown as Konva.KonvaEventObject<PointerEvent>);

  layer.getRelativePointerPosition = originalGetPos;
}

describe("TextPlugin – click-create", () => {
  test("pointerUp in CLICK_CREATE + text mode adds a Konva.Text to staticForegroundLayer", async () => {
    let ctx!: IPluginContext;

    const harness = await createCanvasTestHarness({
      plugins: [new TextPlugin()],
      initializeScene: (context) => {
        ctx = context;
      },
    });

    ctx.setState("mode", CanvasMode.CLICK_CREATE);
    ctx.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "text");

    const textNodesBefore = harness.staticForegroundLayer
      .getChildren()
      .filter((n) => n instanceof Konva.Text);

    firePointerUp(ctx, 100, 150);
    await flushCanvasEffects();

    expect(ctx.state.mode).toBe(CanvasMode.SELECT);

    const textNodesAfter = harness.staticForegroundLayer
      .getChildren()
      .filter((n) => n instanceof Konva.Text);

    expect(textNodesAfter.length).toBe(textNodesBefore.length + 1);

    const added = textNodesAfter[textNodesAfter.length - 1] as Konva.Text;
    expect(added.x()).toBeCloseTo(100, 0);
    expect(added.y()).toBeCloseTo(150, 0);

    harness.destroy();
  });

  test("new text edit box opens at single-line height", async () => {
    let ctx!: IPluginContext;

    const harness = await createCanvasTestHarness({
      plugins: [new TextPlugin()],
      initializeScene: (context) => {
        ctx = context;
      },
    });

    ctx.setState("mode", CanvasMode.CLICK_CREATE);
    ctx.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "text");

    firePointerUp(ctx, 100, 150);
    await flushCanvasEffects();

    const added = harness.staticForegroundLayer.findOne<Konva.Text>("Text")!;
    const textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;

    expect(textarea).not.toBeNull();
    expect(textarea.rows).toBe(1);
    expect(parseFloat(textarea.style.height)).toBeCloseTo(TextPlugin.computeTextHeight(added, ""), 0);

    textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await flushCanvasEffects();

    harness.destroy();
  });

  test("pointerUp in DRAW_CREATE mode is ignored", async () => {
    let ctx!: IPluginContext;

    const harness = await createCanvasTestHarness({
      plugins: [new TextPlugin()],
      initializeScene: (context) => {
        ctx = context;
      },
    });

    ctx.setState("mode", CanvasMode.DRAW_CREATE);
    ctx.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "text");

    const before = harness.staticForegroundLayer.getChildren().length;
    firePointerUp(ctx, 100, 150);
    await flushCanvasEffects();

    expect(harness.staticForegroundLayer.getChildren().length).toBe(before);

    harness.destroy();
  });
});
