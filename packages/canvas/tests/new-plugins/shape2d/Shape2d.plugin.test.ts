import Konva from "konva";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { describe, expect, test } from "vitest";
import { CanvasMode } from "../../../src/new-services/selection/enum";
import { createMockDocHandle, createNewCanvasHarness, flushCanvasEffects } from "../../new-test-setup";

function createRectElement(overrides?: Partial<TElement>): TElement {
  return {
    id: "rect-1",
    x: 120,
    y: 140,
    rotation: 0,
    bindings: [],
    createdAt: 1,
    updatedAt: 2,
    locked: false,
    parentGroupId: null,
    zIndex: "z00000000",
    style: {
      backgroundColor: "#ef4444",
      opacity: 1,
      strokeWidth: 0,
    },
    data: {
      type: "rect",
      w: 180,
      h: 120,
    },
    ...overrides,
  } satisfies TElement;
}

function createDiamondElement(overrides?: Partial<TElement>): TElement {
  return {
    id: "diamond-1",
    x: 160,
    y: 200,
    rotation: 10,
    bindings: [],
    createdAt: 1,
    updatedAt: 2,
    locked: false,
    parentGroupId: null,
    zIndex: "z00000000",
    style: {
      backgroundColor: "#38bdf8",
      opacity: 0.9,
      strokeColor: "#0f172a",
      strokeWidth: 2,
    },
    data: {
      type: "diamond",
      w: 120,
      h: 80,
    },
    ...overrides,
  } satisfies TElement;
}

function createHookPointerEvent(type: string, args?: { shiftKey?: boolean }) {
  return {
    target: null,
    currentTarget: null,
    evt: new PointerEvent(type, { shiftKey: args?.shiftKey ?? false }),
    cancelBubble: false,
  } as unknown as Konva.KonvaEventObject<PointerEvent>;
}

function createHookMouseMoveEvent(args?: { shiftKey?: boolean }) {
  return {
    target: null,
    currentTarget: null,
    evt: new MouseEvent("pointermove", { shiftKey: args?.shiftKey ?? false }),
    cancelBubble: false,
  } as unknown as Konva.KonvaEventObject<MouseEvent>;
}

function withDynamicPointer(
  harness: Awaited<ReturnType<typeof createNewCanvasHarness>>,
  point: { x: number; y: number },
  callback: () => void,
) {
  const original = harness.dynamicLayer.getRelativePointerPosition.bind(harness.dynamicLayer);
  harness.dynamicLayer.getRelativePointerPosition = () => point;
  callback();
  harness.dynamicLayer.getRelativePointerPosition = original;
}

function fireGroupShortcut(runtime: Awaited<ReturnType<typeof createNewCanvasHarness>>["runtime"]) {
  const event = new KeyboardEvent("keydown", {
    key: "g",
    metaKey: true,
    bubbles: true,
    cancelable: true,
  });
  runtime.hooks.keydown.call(event);
}

describe("new Shape2d plugin", () => {
  test("registers rectangle, diamond, and ellipse tools in editor registry", async () => {
    const harness = await createNewCanvasHarness();
    const editor = harness.runtime.services.require("editor");

    expect(editor.getTool("rectangle")?.shortcuts).toEqual(["2", "r"]);
    expect(editor.getTool("diamond")?.shortcuts).toEqual(["3", "d"]);
    expect(editor.getTool("ellipse")?.shortcuts).toEqual(["4", "o"]);

    await harness.destroy();
  });

  test("draw-create rectangle commits to scene and returns to select tool", async () => {
    const harness = await createNewCanvasHarness();
    const editor = harness.runtime.services.require("editor");
    const selection = harness.runtime.services.require("selection");

    editor.setActiveTool("rectangle");
    await flushCanvasEffects();

    withDynamicPointer(harness, { x: 120, y: 140 }, () => {
      harness.runtime.hooks.pointerDown.call(createHookPointerEvent("pointerdown"));
    });
    withDynamicPointer(harness, { x: 300, y: 260 }, () => {
      harness.runtime.hooks.pointerMove.call(createHookMouseMoveEvent());
    });
    harness.runtime.hooks.pointerUp.call(createHookPointerEvent("pointerup"));
    await flushCanvasEffects();

    const rectNode = harness.staticForegroundLayer.findOne<Konva.Rect>((candidate: Konva.Node) => {
      return candidate instanceof Konva.Rect && candidate.getAttr("vcShape2dType") === "rect";
    });
    const [element] = Object.values(harness.docHandle.doc().elements);

    expect(rectNode).toBeInstanceOf(Konva.Rect);
    expect(element?.data.type).toBe("rect");
    expect((element?.data as { w: number; h: number } | undefined)?.w).toBeCloseTo(180, 6);
    expect((element?.data as { w: number; h: number } | undefined)?.h).toBeCloseTo(120, 6);
    expect(element?.x).toBeCloseTo(120, 6);
    expect(element?.y).toBeCloseTo(140, 6);
    expect(editor.activeToolId).toBe("select");
    expect(selection.mode).toBe(CanvasMode.SELECT);
    expect(selection.selection.map((node) => node.id())).toEqual([rectNode!.id()]);

    await harness.destroy();
  });

  test("shift-draw ellipse keeps a 1:1 ratio", async () => {
    const harness = await createNewCanvasHarness();
    const editor = harness.runtime.services.require("editor");

    editor.setActiveTool("ellipse");
    await flushCanvasEffects();

    withDynamicPointer(harness, { x: 300, y: 220 }, () => {
      harness.runtime.hooks.pointerDown.call(createHookPointerEvent("pointerdown"));
    });
    withDynamicPointer(harness, { x: 420, y: 280 }, () => {
      harness.runtime.hooks.pointerMove.call(createHookMouseMoveEvent({ shiftKey: true }));
    });
    harness.runtime.hooks.pointerUp.call(createHookPointerEvent("pointerup"));
    await flushCanvasEffects();

    const [element] = Object.values(harness.docHandle.doc().elements);
    expect(element?.data.type).toBe("ellipse");
    expect((element?.data as { rx: number; ry: number } | undefined)?.rx).toBeCloseTo(60, 6);
    expect((element?.data as { rx: number; ry: number } | undefined)?.ry).toBeCloseTo(60, 6);
    expect(element?.x).toBeCloseTo(300, 6);
    expect(element?.y).toBeCloseTo(220, 6);

    await harness.destroy();
  });

  test("shared transformer bakes diamond scale into persisted size and resets node scale", async () => {
    const element = createDiamondElement();
    const docHandle = createMockDocHandle({
      elements: {
        [element.id]: structuredClone(element),
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    const selection = harness.runtime.services.require("selection");
    const node = harness.staticForegroundLayer.findOne<Konva.Line>(`#${element.id}`)!;
    const transformer = harness.dynamicLayer.find((candidate: Konva.Node) => candidate instanceof Konva.Transformer)[0] as Konva.Transformer;

    selection.setSelection([node]);
    selection.setFocusedNode(node);
    await flushCanvasEffects();

    transformer.fire("transformstart", {
      target: node,
      currentTarget: transformer,
      evt: new MouseEvent("transformstart", { bubbles: true }),
    });
    node.scaleX(1.5);
    node.scaleY(2);
    node.absolutePosition({ x: node.absolutePosition().x + 40, y: node.absolutePosition().y + 25 });
    transformer.fire("transformend", {
      target: node,
      currentTarget: transformer,
      evt: new MouseEvent("transformend", { bubbles: true }),
    });
    await flushCanvasEffects();

    const persisted = harness.docHandle.doc().elements[element.id];
    expect(persisted?.data.type).toBe("diamond");
    expect((persisted?.data as { w: number; h: number } | undefined)?.w).toBeCloseTo(180, 6);
    expect((persisted?.data as { w: number; h: number } | undefined)?.h).toBeCloseTo(160, 6);
    expect(persisted?.x).toBeCloseTo(200, 6);
    expect(persisted?.y).toBeCloseTo(225, 6);
    expect(node.scaleX()).toBeCloseTo(1, 6);
    expect(node.scaleY()).toBeCloseTo(1, 6);

    await harness.destroy();
  });

  test("group plugin can group rect nodes and scene hydrator restores grouped shape2d nodes", async () => {
    const rectA = createRectElement({ id: "rect-a", x: 40, y: 60, zIndex: "z00000000" });
    const rectB = createRectElement({ id: "rect-b", x: 260, y: 180, zIndex: "z00000001" });
    const docHandle = createMockDocHandle({
      elements: {
        [rectA.id]: structuredClone(rectA),
        [rectB.id]: structuredClone(rectB),
      },
    });

    const firstHarness = await createNewCanvasHarness({ docHandle });
    const selection = firstHarness.runtime.services.require("selection");
    const nodeA = firstHarness.staticForegroundLayer.findOne<Konva.Rect>("#rect-a")!;
    const nodeB = firstHarness.staticForegroundLayer.findOne<Konva.Rect>("#rect-b")!;

    selection.setSelection([nodeA, nodeB]);
    selection.setFocusedNode(nodeB);
    fireGroupShortcut(firstHarness.runtime);
    await flushCanvasEffects();

    const groupedNode = firstHarness.staticForegroundLayer.findOne<Konva.Group>((candidate: Konva.Node) => {
      return candidate instanceof Konva.Group;
    })!;
    expect(groupedNode).toBeTruthy();
    expect(docHandle.doc().elements[rectA.id]?.parentGroupId).toBe(groupedNode.id());
    expect(docHandle.doc().elements[rectB.id]?.parentGroupId).toBe(groupedNode.id());

    await firstHarness.destroy();

    const secondHarness = await createNewCanvasHarness({ docHandle });
    const rehydratedGroup = secondHarness.staticForegroundLayer.findOne<Konva.Group>(`#${groupedNode.id()}`)!;
    const rehydratedRectA = secondHarness.staticForegroundLayer.findOne<Konva.Rect>("#rect-a")!;
    const rehydratedRectB = secondHarness.staticForegroundLayer.findOne<Konva.Rect>("#rect-b")!;

    expect(rehydratedGroup).toBeTruthy();
    expect(rehydratedRectA.getParent()).toBe(rehydratedGroup);
    expect(rehydratedRectB.getParent()).toBe(rehydratedGroup);
    expect(rehydratedGroup.getChildren().filter((candidate) => candidate instanceof Konva.Rect)).toHaveLength(2);

    await secondHarness.destroy();
  });
});
