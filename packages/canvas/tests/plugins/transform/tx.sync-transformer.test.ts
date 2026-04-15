import Konva from "konva";
import { describe, expect, test, vi } from "vitest";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { CanvasRegistryService } from "../../../src/services/canvas-registry/CanvasRegistryService";
import { SelectionService } from "../../../src/services/selection/SelectionService";
import { txSyncTransformer } from "../../../src/plugins/transform/tx.sync-transformer";

function createTextElement(id: string): TElement {
  return {
    id,
    x: 10,
    y: 20,
    rotation: 0,
    zIndex: "z00000000",
    parentGroupId: null,
    bindings: [],
    locked: false,
    createdAt: 1,
    updatedAt: 1,
    data: {
      type: "text",
      w: 120,
      h: 40,
      text: "hello",
      originalText: "hello",
      fontSize: 16,
      fontFamily: "Arial",
      textAlign: "left",
      verticalAlign: "top",
      lineHeight: 1.2,
      link: null,
      containerId: null,
      autoResize: false,
    },
    style: {},
  };
}

function attachToStage<TNode extends Konva.Node>(node: TNode) {
  Object.defineProperty(node, "getStage", {
    configurable: true,
    value: () => ({}) as Konva.Stage,
  });
  return node;
}

function createTransformerMock() {
  let nodes: Konva.Node[] = [];
  let borderEnabled = true;
  let borderDash: number[] = [];
  let keepRatio = false;
  let flipEnabled = true;
  let enabledAnchors: string[] = [];

  return {
    setNodes: vi.fn((nextNodes: Konva.Node[]) => {
      nodes = nextNodes;
    }),
    update: vi.fn(),
    borderEnabled: vi.fn((next?: boolean) => {
      if (typeof next === "boolean") borderEnabled = next;
      return borderEnabled;
    }),
    borderDash: vi.fn((next?: number[]) => {
      if (next) borderDash = next;
      return borderDash;
    }),
    keepRatio: vi.fn((next?: boolean) => {
      if (typeof next === "boolean") keepRatio = next;
      return keepRatio;
    }),
    flipEnabled: vi.fn((next?: boolean) => {
      if (typeof next === "boolean") flipEnabled = next;
      return flipEnabled;
    }),
    enabledAnchors: vi.fn((next?: string[]) => {
      if (next) enabledAnchors = next;
      return enabledAnchors;
    }),
    nodes: () => nodes,
  };
}

describe("txSyncTransformer", () => {
  test("clears transformer nodes while text or shape1d editing is active", () => {
    const batchDrawSpy = vi.fn();
    const transformer = createTransformerMock();

    txSyncTransformer({
      canvasRegistry: new CanvasRegistryService(),
      editor: {
        editingTextId: "text-1",
        editingShape1dId: null,
      } as never,
      Konva,
      scene: {
        dynamicLayer: { batchDraw: batchDrawSpy },
      } as never,
      selection: new SelectionService(),
      transformer: transformer as never,
    }, {});

    expect(transformer.setNodes).toHaveBeenCalledWith([]);
    expect(transformer.update).toHaveBeenCalled();
    expect(batchDrawSpy).toHaveBeenCalled();
  });

  test("syncs filtered nodes and transform options onto transformer", () => {
    const canvasRegistry = new CanvasRegistryService();
    const selection = new SelectionService();
    const transformer = createTransformerMock();
    const batchDrawSpy = vi.fn();
    const nodeA = attachToStage(new Konva.Rect({ id: "a" }));
    const nodeB = attachToStage(new Konva.Rect({ id: "b" }));

    canvasRegistry.registerElement({
      id: "rect",
      matchesNode: (candidate) => candidate.id() === nodeA.id() || candidate.id() === nodeB.id(),
      toElement: (candidate) => createTextElement(candidate.id()),
    });

    selection.setSelection([nodeA, nodeB]);

    txSyncTransformer({
      canvasRegistry,
      editor: {
        editingTextId: null,
        editingShape1dId: null,
      } as never,
      Konva,
      scene: {
        dynamicLayer: { batchDraw: batchDrawSpy },
      } as never,
      selection,
      transformer: transformer as never,
    }, {});

    expect(transformer.nodes()).toEqual([nodeA, nodeB]);
    expect(transformer.borderDash()).toEqual([2, 2]);
    expect(transformer.keepRatio()).toBe(true);
    expect(transformer.enabledAnchors()).toEqual(["top-left", "top-right", "bottom-left", "bottom-right"]);
    expect(batchDrawSpy).toHaveBeenCalled();
  });
});
