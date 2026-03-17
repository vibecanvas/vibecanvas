import Konva from "konva";
import { createEffect } from "solid-js";
import { describe, expect, test, vi } from "vitest";
import { GroupPlugin } from "../src/plugins/Group.plugin";
import type { IPlugin, IPluginContext } from "../src/plugins/interface";
import { SelectPlugin } from "../src/plugins/Select.plugin";
import { TransformPlugin } from "../src/plugins/Transform.plugin";
import { initializeScene01SelectOuterGroupFromChild } from "./scenarios/01-select-outer-group-from-child";
import { createCanvasTestHarness, flushCanvasEffects } from "./test-setup";

class SelectionProbePlugin implements IPlugin {
  observedSelectionIds: string[] = [];

  apply(context: IPluginContext): void {
    context.hooks.init.tap(() => {
      createEffect(() => {
        this.observedSelectionIds = context.state.selection.map((node) => node.id());
      });
    });
  }
}

describe("SelectPlugin", () => {
  test("scene1: s1 pointerdown -> outergroup is selected with transformer and boundary box", async () => {
    vi.useFakeTimers();

    const setNodesSpy = vi.spyOn(Konva.Transformer.prototype, "setNodes");
    const groupPlugin = new GroupPlugin();
    const selectionProbePlugin = new SelectionProbePlugin();
    const plugins: IPlugin[] = [
      new SelectPlugin(),
      new TransformPlugin(),
      groupPlugin,
      selectionProbePlugin,
    ];

    const harness = await createCanvasTestHarness({
      plugins,
      initializeScene: (context) => {
        initializeScene01SelectOuterGroupFromChild({
          context,
          groupPlugin,
        });
      },
    });
    const { staticForegroundLayer, dynamicLayer } = harness;
    const s1 = staticForegroundLayer.findOne<Konva.Rect>("#1");
    const g1 = staticForegroundLayer.getChildren().find((node): node is Konva.Group => node instanceof Konva.Group);

    expect(s1).toBeTruthy();
    expect(g1).toBeTruthy();

    s1!.fire(
      "pointerdown",
      {
        evt: new MouseEvent("pointerdown", { bubbles: true, button: 0 }),
      },
      true,
    );

    await flushCanvasEffects();

    expect(selectionProbePlugin.observedSelectionIds).toEqual([g1!.id()]);

    const transformer = dynamicLayer.getChildren().find(
      (node): node is Konva.Transformer => node instanceof Konva.Transformer,
    );
    expect(transformer).toBeTruthy();
    expect(transformer!.isVisible()).toBe(true);
    expect(setNodesSpy).toHaveBeenCalledWith([g1!]);

    const boundary = dynamicLayer.getChildren().find(
      (node): node is Konva.Rect => node instanceof Konva.Rect && node.name() === `group-boundary:${g1!.id()}`,
    );
    expect(boundary).toBeTruthy();
    expect(boundary!.visible()).toBe(true);

    harness.destroy();
    setNodesSpy.mockRestore();
    vi.useRealTimers();
  });
});
