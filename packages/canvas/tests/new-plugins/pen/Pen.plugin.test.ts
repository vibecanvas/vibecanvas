import Konva from "konva";
import type { TElement, TPenData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { describe, expect, test } from "vitest";
import { createPenDataFromStrokePoints, type TStrokePoint } from "../../../src/new-plugins/pen/pen.math";
import { createMockDocHandle, createNewCanvasHarness, flushCanvasEffects } from "../../new-test-setup";

function createPenElement(args?: {
  id?: string;
  rotation?: number;
  points?: TStrokePoint[];
}): TElement {
  const strokePoints = args?.points ?? [
    { x: 120, y: 80, pressure: 0.5 },
    { x: 150, y: 100, pressure: 0.55 },
    { x: 185, y: 110, pressure: 0.6 },
    { x: 220, y: 135, pressure: 0.5 },
  ];
  const penData = createPenDataFromStrokePoints(strokePoints);
  if (!penData) {
    throw new Error("Failed to create pen data for test");
  }

  return {
    id: args?.id ?? "pen-1",
    x: penData.x,
    y: penData.y,
    rotation: args?.rotation ?? 0,
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
  } satisfies TElement;
}

function createHookPointerEvent(type: string, pressure = 0.5) {
  return {
    target: null,
    currentTarget: null,
    evt: new PointerEvent(type, { pressure }),
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

function getPersistedPenElement(docHandle: ReturnType<typeof createMockDocHandle>, id: string) {
  const element = docHandle.doc().elements[id];
  if (!element || element.data.type !== "pen") {
    throw new Error(`Expected persisted pen element '${id}'`);
  }

  return element as TElement & { data: TPenData };
}

function altDragPen(node: Konva.Path, args: { dx: number; dy: number }) {
  const beforeNodeIds = new Set(
    node.getStage()?.getLayers().flatMap((layer) => layer.getChildren()).map((child) => child._id) ?? [],
  );

  node.fire("dragstart", {
    target: node,
    currentTarget: node,
    evt: new MouseEvent("dragstart", { bubbles: true, altKey: true }),
  });

  const previewClone = node.getStage()?.getLayers()
    .flatMap((layer) => layer.getChildren())
    .find((child) => !beforeNodeIds.has(child._id) && child instanceof Konva.Path) as Konva.Path | undefined;

  if (!previewClone) {
    throw new Error("Expected preview clone after alt-drag start");
  }

  const before = previewClone.absolutePosition();
  previewClone.setAbsolutePosition({ x: before.x + args.dx, y: before.y + args.dy });
  previewClone.fire("dragend", {
    target: previewClone,
    currentTarget: previewClone,
    evt: new MouseEvent("dragend", { bubbles: true, altKey: true }),
  });
}

describe("new Pen plugin", () => {
  test("Escape cancels an in-progress pen preview", async () => {
    const harness = await createNewCanvasHarness();
    const editor = harness.runtime.services.require("editor");
    const selection = harness.runtime.services.require("selection");

    editor.setActiveTool("pen");
    await flushCanvasEffects();

    withDynamicPointer(harness, { x: 120, y: 80 }, () => {
      harness.runtime.hooks.pointerDown.call(createHookPointerEvent("pointerdown", 0.4));
    });
    withDynamicPointer(harness, { x: 180, y: 120 }, () => {
      harness.runtime.hooks.pointerMove.call(createHookPointerEvent("pointermove", 0.6) as Konva.KonvaEventObject<MouseEvent>);
    });

    expect(harness.dynamicLayer.find((node: Konva.Node) => node instanceof Konva.Path)).toHaveLength(1);

    harness.runtime.hooks.keydown.call(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    harness.runtime.hooks.pointerUp.call(createHookPointerEvent("pointerup", 0.5));
    await flushCanvasEffects();

    expect(harness.dynamicLayer.find((node: Konva.Node) => node instanceof Konva.Path)).toHaveLength(0);
    expect(harness.staticForegroundLayer.find((node: Konva.Node) => node instanceof Konva.Path)).toHaveLength(0);
    expect(Object.keys(harness.docHandle.doc().elements)).toHaveLength(0);
    expect(editor.activeToolId).toBe("select");
    expect(selection.mode).toBe("select");

    await harness.destroy();
  });

  test("draw-create commits a pen path to scene and CRDT and stays in pen mode", async () => {
    const harness = await createNewCanvasHarness();
    const editor = harness.runtime.services.require("editor");
    const selection = harness.runtime.services.require("selection");

    editor.setActiveTool("pen");
    await flushCanvasEffects();

    withDynamicPointer(harness, { x: 120, y: 80 }, () => {
      harness.runtime.hooks.pointerDown.call(createHookPointerEvent("pointerdown", 0.4));
    });
    withDynamicPointer(harness, { x: 160, y: 110 }, () => {
      harness.runtime.hooks.pointerMove.call(createHookPointerEvent("pointermove", 0.6) as Konva.KonvaEventObject<MouseEvent>);
    });
    withDynamicPointer(harness, { x: 210, y: 140 }, () => {
      harness.runtime.hooks.pointerMove.call(createHookPointerEvent("pointermove", 0.5) as Konva.KonvaEventObject<MouseEvent>);
    });

    const previewPath = harness.dynamicLayer.find((node: Konva.Node) => node instanceof Konva.Path)[0] as Konva.Path | undefined;
    expect(previewPath).toBeInstanceOf(Konva.Path);

    harness.runtime.hooks.pointerUp.call(createHookPointerEvent("pointerup", 0.5));
    await flushCanvasEffects();

    const penNodes = harness.staticForegroundLayer.find((node: Konva.Node) => node instanceof Konva.Path) as Konva.Path[];
    expect(penNodes).toHaveLength(1);
    expect(editor.activeToolId).toBe("pen");
    expect(selection.mode).toBe("draw_create");

    const docElements = Object.values(harness.docHandle.doc().elements);
    expect(docElements).toHaveLength(1);
    expect(docElements[0]?.data.type).toBe("pen");
    if (docElements[0]?.data.type !== "pen") {
      throw new Error("Expected created document element to be a pen");
    }
    expect(docElements[0].data.points.length).toBeGreaterThanOrEqual(3);
    expect(penNodes[0]?.id()).toBe(previewPath?.id());
    expect(docElements[0]?.id).toBe(penNodes[0]?.id());
    expect(harness.dynamicLayer.find((node: Konva.Node) => node instanceof Konva.Path)).toHaveLength(0);

    await harness.destroy();
  });

  test("SceneHydratorPlugin mounts persisted pen elements", async () => {
    const element = createPenElement();
    const docHandle = createMockDocHandle({
      elements: {
        [element.id]: element,
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    const node = harness.staticForegroundLayer.findOne<Konva.Path>(`#${element.id}`);

    expect(node).toBeInstanceOf(Konva.Path);
    expect(node?.data().length).toBeGreaterThan(0);
    expect(node?.fill()).toBe(element.style.backgroundColor);

    await harness.destroy();
  });

  test("drag updates pen position in CRDT and history undo redo", async () => {
    const element = createPenElement();
    const docHandle = createMockDocHandle({
      elements: {
        [element.id]: structuredClone(element),
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    const history = harness.runtime.services.require("history");
    const selection = harness.runtime.services.require("selection");
    const node = harness.staticForegroundLayer.findOne<Konva.Path>(`#${element.id}`)!;
    const before = { ...node.absolutePosition() };

    selection.setSelection([node]);
    selection.setFocusedNode(node);
    await flushCanvasEffects();

    node.fire("dragstart", {
      target: node,
      currentTarget: node,
      evt: new MouseEvent("dragstart", { bubbles: true }),
    });
    node.setAbsolutePosition({ x: before.x + 45, y: before.y + 20 });
    node.fire("dragmove", {
      target: node,
      currentTarget: node,
      evt: new MouseEvent("dragmove", { bubbles: true }),
    });
    node.fire("dragend", {
      target: node,
      currentTarget: node,
      evt: new MouseEvent("dragend", { bubbles: true }),
    });
    await flushCanvasEffects();

    expect(node.absolutePosition().x).toBeCloseTo(before.x + 45, 6);
    expect(node.absolutePosition().y).toBeCloseTo(before.y + 20, 6);
    expect(docHandle.doc().elements[element.id]?.x).toBeCloseTo(before.x + 45, 6);
    expect(docHandle.doc().elements[element.id]?.y).toBeCloseTo(before.y + 20, 6);

    history.undo();
    await flushCanvasEffects();
    expect(node.absolutePosition().x).toBeCloseTo(before.x, 6);
    expect(node.absolutePosition().y).toBeCloseTo(before.y, 6);

    history.redo();
    await flushCanvasEffects();
    expect(node.absolutePosition().x).toBeCloseTo(before.x + 45, 6);
    expect(node.absolutePosition().y).toBeCloseTo(before.y + 20, 6);

    await harness.destroy();
  });

  test("alt-drag clone creates a second persisted pen element", async () => {
    const element = createPenElement();
    const docHandle = createMockDocHandle({
      elements: {
        [element.id]: structuredClone(element),
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    const selection = harness.runtime.services.require("selection");
    const sourceNode = harness.staticForegroundLayer.findOne<Konva.Path>(`#${element.id}`)!;

    selection.setSelection([sourceNode]);
    selection.setFocusedNode(sourceNode);
    await flushCanvasEffects();

    altDragPen(sourceNode, { dx: 70, dy: 30 });
    await flushCanvasEffects();

    const persistedPenElements = Object.values(docHandle.doc().elements).filter((candidate) => candidate.data.type === "pen");
    expect(persistedPenElements).toHaveLength(2);

    const createdClone = persistedPenElements.find((candidate) => candidate.id !== element.id);
    expect(createdClone).toBeTruthy();
    if (!createdClone || createdClone.data.type !== "pen") {
      throw new Error("Expected cloned document element to be a pen");
    }

    const clonedPenData = createdClone.data as TPenData;
    const sourcePenData = element.data as TPenData;
    expect(clonedPenData.points).toEqual(sourcePenData.points);
    expect(clonedPenData.pressures).toEqual(sourcePenData.pressures);
    expect(selection.selection[0]?.id()).toBe(createdClone.id);

    await harness.destroy();
  });

  test("shared transformer resize bakes scale into pen points and resets node scale", async () => {
    const element = createPenElement();
    const docHandle = createMockDocHandle({
      elements: {
        [element.id]: structuredClone(element),
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    const history = harness.runtime.services.require("history");
    const selection = harness.runtime.services.require("selection");
    const node = harness.staticForegroundLayer.findOne<Konva.Path>(`#${element.id}`)!;
    const transformer = harness.dynamicLayer.find((candidate: Konva.Node) => candidate instanceof Konva.Transformer)[0] as Konva.Transformer;
    const originalPoints = structuredClone(getPersistedPenElement(docHandle, element.id).data.points);

    selection.setSelection([node]);
    selection.setFocusedNode(node);
    await flushCanvasEffects();

    transformer.fire("transformstart", {
      target: node,
      currentTarget: transformer,
      evt: new MouseEvent("transformstart", { bubbles: true }),
    });
    node.scaleX(1.8);
    node.scaleY(1.4);
    node.x(node.x() + 25);
    node.y(node.y() + 10);
    transformer.fire("transformend", {
      target: node,
      currentTarget: transformer,
      evt: new MouseEvent("transformend", { bubbles: true }),
    });
    await flushCanvasEffects();

    const resizedElement = getPersistedPenElement(docHandle, element.id);
    expect(resizedElement.data.points[1]?.[0]).toBeGreaterThan(originalPoints[1]?.[0] ?? 0);
    expect(resizedElement.data.points[1]?.[1]).toBeGreaterThan(originalPoints[1]?.[1] ?? 0);
    expect(node.scaleX()).toBeCloseTo(1, 6);
    expect(node.scaleY()).toBeCloseTo(1, 6);

    history.undo();
    await flushCanvasEffects();
    expect(getPersistedPenElement(docHandle, element.id).data.points).toEqual(originalPoints);

    history.redo();
    await flushCanvasEffects();
    expect(getPersistedPenElement(docHandle, element.id).data.points[1]?.[0]).toBeGreaterThan(originalPoints[1]?.[0] ?? 0);

    await harness.destroy();
  });
});
