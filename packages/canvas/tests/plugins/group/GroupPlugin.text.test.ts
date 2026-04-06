import Konva from "konva";
import type { DocHandle } from "@automerge/automerge-repo";
import type { TCanvasDoc } from "@vibecanvas/automerge-service/types/canvas-doc";
import { describe, expect, test } from "vitest";
import { GroupPlugin, SelectPlugin, Shape2dPlugin, TextPlugin, TransformPlugin, type IPluginContext } from "../../../src/plugins";
import { createCanvasTestHarness, createMockDocHandle, flushCanvasEffects } from "../../test-setup";

describe("GroupPlugin – text integration", () => {
  test("free text node inside a group preserves absolute position on group/ungroup", async () => {
    let ctx!: IPluginContext;
    const docHandle = createMockDocHandle() as DocHandle<TCanvasDoc>;

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new TextPlugin(), new GroupPlugin()],
      initializeScene: (context) => {
        ctx = context;

        const textNode = new Konva.Text({
          id: "group-text-1",
          x: 80,
          y: 90,
          width: 200,
          height: 30,
          text: "grouped text",
          fontSize: 16,
          fontFamily: "Arial",
        });
        textNode.draggable(true);
        TextPlugin.setupShapeListeners(context, textNode);
        context.staticForegroundLayer.add(textNode);

        const rect = new Konva.Rect({ id: "group-rect-1", x: 200, y: 90, width: 100, height: 50 });
        context.staticForegroundLayer.add(rect);
      },
    });

    const textNode = harness.staticForegroundLayer.findOne<Konva.Text>("#group-text-1")!;
    const rect = harness.staticForegroundLayer.findOne<Konva.Rect>("#group-rect-1")!;
    const textAbsBefore = { ...textNode.getAbsolutePosition() };

    const group = GroupPlugin.group(ctx, [textNode, rect]);
    expect(textNode.getParent()).toBe(group);
    expect(textNode.getAbsolutePosition().x).toBeCloseTo(textAbsBefore.x, 5);
    expect(textNode.getAbsolutePosition().y).toBeCloseTo(textAbsBefore.y, 5);

    GroupPlugin.ungroup(ctx, group);
    expect(textNode.getParent()).toBe(harness.staticForegroundLayer);
    expect(textNode.getAbsolutePosition().x).toBeCloseTo(textAbsBefore.x, 5);
    expect(textNode.getAbsolutePosition().y).toBeCloseTo(textAbsBefore.y, 5);

    harness.destroy();
  });

  test("grouping a rect automatically includes its attached text and preserves container linkage", async () => {
    let ctx!: IPluginContext;
    const docHandle = createMockDocHandle() as DocHandle<TCanvasDoc>;

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new SelectPlugin(), new TransformPlugin(), new Shape2dPlugin(), new TextPlugin(), new GroupPlugin()],
      initializeScene: (context) => {
        ctx = context;
        const rect = Shape2dPlugin.createRectFromElement({
          id: "attached-group-rect",
          x: 120,
          y: 100,
          rotation: 0,
          bindings: [],
          createdAt: Date.now(),
          locked: false,
          parentGroupId: null,
          updatedAt: Date.now(),
          zIndex: "",
          data: { type: "rect", w: 180, h: 100 },
          style: { backgroundColor: "red" },
        });
        Shape2dPlugin.setupShapeListeners(context, rect);
        rect.setDraggable(true);
        context.staticForegroundLayer.add(rect);
        context.crdt.patch({ elements: [Shape2dPlugin.toTElement(rect)], groups: [] });

        context.setState("selection", [rect]);
        context.hooks.keydown.call(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
      },
    });

    await flushCanvasEffects();

    const rect = harness.staticForegroundLayer.findOne<Konva.Rect>("#attached-group-rect")!;
    const attachedText = harness.staticForegroundLayer.findOne<Konva.Text>((node: Konva.Node) => node instanceof Konva.Text && TextPlugin.getContainerId(node) === rect.id())!;
    const textarea = ctx.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "inside rect";
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    const textAbsBefore = { ...attachedText.absolutePosition() };
    const group = GroupPlugin.group(ctx, [rect]);

    expect(rect.getParent()).toBe(group);
    expect(attachedText.getParent()).toBe(group);
    expect(attachedText.absolutePosition().x).toBeCloseTo(textAbsBefore.x, 5);
    expect(attachedText.absolutePosition().y).toBeCloseTo(textAbsBefore.y, 5);
    expect(TextPlugin.getContainerId(attachedText)).toBe(rect.id());
    expect(docHandle.doc().elements[attachedText.id()].parentGroupId).toBe(group.id());

    GroupPlugin.ungroup(ctx, group);
    expect(attachedText.getParent()).toBe(harness.staticForegroundLayer);
    expect(TextPlugin.getContainerId(attachedText)).toBe(rect.id());
    expect(docHandle.doc().elements[attachedText.id()].parentGroupId).toBeNull();

    harness.destroy();
  });
});
