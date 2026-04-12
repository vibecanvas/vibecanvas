import Konva from "konva";
import type { TArrowData, TElement, TLineData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { describe, expect, test } from "vitest";
import { isShape1dNode } from "../../../src/new-plugins/shape1d/Shape1d.shared";
import { createMockDocHandle, createNewCanvasHarness, flushCanvasEffects } from "../../new-test-setup";

function createHookPointerEvent(type: string) {
  return {
    target: null,
    currentTarget: null,
    evt: new PointerEvent(type),
    cancelBubble: false,
  } as unknown as Konva.KonvaEventObject<PointerEvent>;
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

function createArrowElement(args?: { id?: string }) {
  return {
    id: args?.id ?? "arrow-1",
    x: 120,
    y: 80,
    rotation: 0,
    bindings: [],
    createdAt: 1,
    updatedAt: 1,
    locked: false,
    parentGroupId: null,
    zIndex: "",
    style: {
      strokeColor: "#0f172a",
      opacity: 0.92,
      strokeWidth: 4,
    },
    data: {
      type: "arrow",
      lineType: "straight",
      points: [[0, 0], [90, 45]],
      startBinding: null,
      endBinding: null,
      startCap: "none",
      endCap: "arrow",
    } satisfies TArrowData,
  } satisfies TElement;
}

function altDragProxy(
  proxy: Konva.Rect,
  args: {
    dx: number;
    dy: number;
    findPreviewClone: () => Konva.Node | undefined;
  },
) {
  proxy.fire("dragstart", {
    target: proxy,
    currentTarget: proxy,
    evt: new MouseEvent("dragstart", { bubbles: true, altKey: true }),
  });

  const previewClone = args.findPreviewClone();
  if (!previewClone) {
    throw new Error("Expected preview clone after alt-drag from proxy");
  }

  const before = previewClone.absolutePosition();
  previewClone.setAbsolutePosition({ x: before.x + args.dx, y: before.y + args.dy });
  previewClone.fire("dragend", {
    target: previewClone,
    currentTarget: previewClone,
    evt: new MouseEvent("dragend", { bubbles: true, altKey: true }),
  });
}

function getTransformDragProxy(harness: Awaited<ReturnType<typeof createNewCanvasHarness>>) {
  const proxy = harness.staticForegroundLayer.findOne((node: Konva.Node) => {
    return node instanceof Konva.Rect && node.name() === "transform-drag-proxy";
  });

  if (!(proxy instanceof Konva.Rect)) {
    throw new Error("Expected transform drag proxy rect");
  }

  return proxy;
}

describe("new Shape1d plugin", () => {
  test("registers arrow and line tools in editor registry", async () => {
    const harness = await createNewCanvasHarness();
    const editor = harness.runtime.services.require("editor");

    const toolIds = editor.getTools().map((tool) => tool.id);
    expect(toolIds).toContain("arrow");
    expect(toolIds).toContain("line");
    expect(toolIds.indexOf("arrow")).toBeLessThan(toolIds.indexOf("line"));

    await harness.destroy();
  });

  test("draw-create commits a line and returns to select mode", async () => {
    const harness = await createNewCanvasHarness();
    const editor = harness.runtime.services.require("editor");
    const selection = harness.runtime.services.require("selection");

    editor.setActiveTool("line");
    await flushCanvasEffects();

    withDynamicPointer(harness, { x: 100, y: 120 }, () => {
      harness.runtime.hooks.pointerDown.call(createHookPointerEvent("pointerdown"));
    });
    withDynamicPointer(harness, { x: 185, y: 165 }, () => {
      harness.runtime.hooks.pointerMove.call(createHookPointerEvent("pointermove") as Konva.KonvaEventObject<MouseEvent>);
    });
    harness.runtime.hooks.pointerUp.call(createHookPointerEvent("pointerup"));
    await flushCanvasEffects();

    const shapeNodes = harness.staticForegroundLayer.find((node: Konva.Node) => isShape1dNode(node));
    expect(shapeNodes).toHaveLength(1);
    expect(editor.activeToolId).toBe("select");
    expect(selection.mode).toBe("select");

    const element = Object.values(harness.docHandle.doc().elements)[0];
    expect(element).toBeTruthy();
    expect(element?.data.type).toBe("line");
    if (!element || element.data.type !== "line") {
      throw new Error("Expected created element to be a line");
    }

    expect(element.x).toBe(100);
    expect(element.y).toBe(120);
    expect((element.data as TLineData).points[1]).toEqual([85, 45]);

    await harness.destroy();
  });

  test("selected line can drag from transform proxy area", async () => {
    const harness = await createNewCanvasHarness();
    const history = harness.runtime.services.require("history");
    const selection = harness.runtime.services.require("selection");
    const editor = harness.runtime.services.require("editor");

    editor.setActiveTool("line");
    await flushCanvasEffects();

    withDynamicPointer(harness, { x: 100, y: 120 }, () => {
      harness.runtime.hooks.pointerDown.call(createHookPointerEvent("pointerdown"));
    });
    withDynamicPointer(harness, { x: 185, y: 165 }, () => {
      harness.runtime.hooks.pointerMove.call(createHookPointerEvent("pointermove") as Konva.KonvaEventObject<MouseEvent>);
    });
    harness.runtime.hooks.pointerUp.call(createHookPointerEvent("pointerup"));
    await flushCanvasEffects();

    const node = harness.staticForegroundLayer.find((candidate: Konva.Node) => isShape1dNode(candidate))[0];
    if (!node || !isShape1dNode(node)) {
      throw new Error("Expected shape1d node");
    }

    selection.setSelection([node]);
    selection.setFocusedNode(node);
    await flushCanvasEffects();

    const proxy = getTransformDragProxy(harness);
    expect(proxy.visible()).toBe(true);

    const before = { ...node.absolutePosition() };
    proxy.fire("dragstart", {
      target: proxy,
      currentTarget: proxy,
      evt: new MouseEvent("dragstart", { bubbles: true }),
    });
    proxy.setAbsolutePosition({ x: proxy.absolutePosition().x + 40, y: proxy.absolutePosition().y + 25 });
    proxy.fire("dragmove", {
      target: proxy,
      currentTarget: proxy,
      evt: new MouseEvent("dragmove", { bubbles: true }),
    });
    proxy.fire("dragend", {
      target: proxy,
      currentTarget: proxy,
      evt: new MouseEvent("dragend", { bubbles: true }),
    });
    await flushCanvasEffects();

    expect(node.absolutePosition().x).toBeCloseTo(before.x + 40, 6);
    expect(node.absolutePosition().y).toBeCloseTo(before.y + 25, 6);
    const movedElement = harness.docHandle.doc().elements[node.id()];
    expect(movedElement?.x).toBeCloseTo(before.x + 40, 6);
    expect(movedElement?.y).toBeCloseTo(before.y + 25, 6);

    history.undo();
    await flushCanvasEffects();
    expect(node.absolutePosition().x).toBeCloseTo(before.x, 6);
    expect(node.absolutePosition().y).toBeCloseTo(before.y, 6);

    history.redo();
    await flushCanvasEffects();
    expect(node.absolutePosition().x).toBeCloseTo(before.x + 40, 6);
    expect(node.absolutePosition().y).toBeCloseTo(before.y + 25, 6);

    await harness.destroy();
  });

  test("alt-drag clone also works from transform proxy", async () => {
    const element = createArrowElement();
    const docHandle = createMockDocHandle({
      elements: {
        [element.id]: structuredClone(element),
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    const selection = harness.runtime.services.require("selection");
    const sourceNode = harness.staticForegroundLayer.findOne((candidate: Konva.Node) => {
      return isShape1dNode(candidate) && candidate.id() === element.id;
    });
    if (!sourceNode || !isShape1dNode(sourceNode)) {
      throw new Error("Expected source shape1d node");
    }

    selection.setSelection([sourceNode]);
    selection.setFocusedNode(sourceNode);
    await flushCanvasEffects();

    const proxy = getTransformDragProxy(harness);
    const beforeNodeIds = new Set(
      sourceNode.getStage()?.getLayers().flatMap((layer) => layer.getChildren()).map((child) => child._id) ?? [],
    );

    altDragProxy(proxy, {
      dx: 60,
      dy: 24,
      findPreviewClone: () => {
        return sourceNode.getStage()?.getLayers()
          .flatMap((layer) => layer.getChildren())
          .find((child) => !beforeNodeIds.has(child._id) && isShape1dNode(child));
      },
    });
    await flushCanvasEffects();

    const persistedShape1dElements = Object.values(docHandle.doc().elements).filter((candidate) => candidate.data.type === "line" || candidate.data.type === "arrow");
    expect(persistedShape1dElements).toHaveLength(2);

    const createdClone = persistedShape1dElements.find((candidate) => candidate.id !== element.id);
    expect(createdClone).toBeTruthy();
    expect(selection.selection[0]?.id()).toBe(createdClone?.id);

    await harness.destroy();
  });

  test("SceneHydratorPlugin mounts persisted arrow elements", async () => {
    const element = createArrowElement();
    const docHandle = createMockDocHandle({
      elements: {
        [element.id]: structuredClone(element),
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    const node = harness.staticForegroundLayer.findOne((candidate: Konva.Node) => {
      return isShape1dNode(candidate) && candidate.id() === element.id;
    });

    expect(node).toBeTruthy();
    expect(isShape1dNode(node)).toBe(true);
    if (!node || !isShape1dNode(node)) {
      throw new Error("Expected hydrated node to be a shape1d node");
    }

    expect(node.stroke()).toBe(element.style.strokeColor);
    expect(node.opacity()).toBe(element.style.opacity);
    expect(node.getAttr("vcElementData")).toEqual(element.data);

    await harness.destroy();
  });
});
