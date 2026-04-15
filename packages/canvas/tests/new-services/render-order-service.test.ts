import Konva from "konva";
import { describe, expect, test, vi } from "vitest";
import type { TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { fnCreateOrderedZIndex } from "../../src/core/fn.create-ordered-z-index";
import { RenderOrderService } from "../../src/services/render-order/RenderOrderService";
import { EditorService } from "../../src/services/editor/EditorService";
import { HistoryService } from "../../src/services/history/HistoryService";

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
    updatedAt: 2,
    data: {
      type: "text",
      w: 100,
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

function createGroup(id: string): TGroup {
  return {
    id,
    parentGroupId: null,
    zIndex: "z00000000",
    locked: false,
    createdAt: 1,
  };
}

function setup() {
  const staticForegroundLayer = new Konva.Layer();
  const history = new HistoryService();
  const editor = new EditorService();
  const patch = vi.fn();
  const syncDomOrder = vi.fn();

  editor.registerToElement("elements", (node) => {
    if (node.id().startsWith("group:")) {
      return null;
    }

    return node.id() === "" ? null : createTextElement(node.id());
  });

  editor.registerToGroup("groups", (node) => {
    if (!node.id().startsWith("group:")) {
      return null;
    }

    return createGroup(node.id());
  });

  const service = new RenderOrderService({
    crdt: { patch } as unknown as RenderOrderService["crdt"],
    history,
    scene: { staticForegroundLayer } as unknown as RenderOrderService["scene"],
    editor,
    syncDomOrder,
  });

  return { staticForegroundLayer, history, editor, patch, syncDomOrder, service };
}

describe("RenderOrderService", () => {
  test("assignOrderOnInsert persists front, back, beforeId, and afterId placement", () => {
    const { staticForegroundLayer, patch, service } = setup();
    const a = new Konva.Rect({ id: "a" });
    const b = new Konva.Rect({ id: "b" });
    const c = new Konva.Rect({ id: "c" });
    const d = new Konva.Rect({ id: "d" });

    staticForegroundLayer.add(a);
    staticForegroundLayer.add(b);
    staticForegroundLayer.add(c);
    staticForegroundLayer.add(d);

    service.assignOrderOnInsert({ parent: staticForegroundLayer, nodes: [a, b, c, d], position: "back" });
    expect(staticForegroundLayer.getChildren().map((node) => node.id())).toEqual(["a", "b", "c", "d"]);
    expect(service.getNodeZIndex(a)).toBe(fnCreateOrderedZIndex(0));
    expect(service.getNodeZIndex(d)).toBe(fnCreateOrderedZIndex(3));

    const e = new Konva.Rect({ id: "e" });
    staticForegroundLayer.add(e);
    service.assignOrderOnInsert({ parent: staticForegroundLayer, nodes: [e], position: "front" });
    expect(staticForegroundLayer.getChildren().map((node) => node.id())).toEqual(["a", "b", "c", "d", "e"]);

    service.assignOrderOnInsert({ parent: staticForegroundLayer, nodes: [e], position: { beforeId: "c" } });
    expect(staticForegroundLayer.getChildren().map((node) => node.id())).toEqual(["a", "b", "e", "c", "d"]);

    service.assignOrderOnInsert({ parent: staticForegroundLayer, nodes: [e], position: { afterId: "a" } });
    expect(staticForegroundLayer.getChildren().map((node) => node.id())).toEqual(["a", "e", "b", "c", "d"]);

    expect(patch).toHaveBeenLastCalledWith({
      elements: [
        { id: "a", zIndex: fnCreateOrderedZIndex(0) },
        { id: "e", zIndex: fnCreateOrderedZIndex(1) },
        { id: "b", zIndex: fnCreateOrderedZIndex(2) },
        { id: "c", zIndex: fnCreateOrderedZIndex(3) },
        { id: "d", zIndex: fnCreateOrderedZIndex(4) },
      ],
      groups: [],
    });
  });

  test("bundle resolver keeps bundled nodes together for movement and undo redo", () => {
    const { staticForegroundLayer, history, patch, service } = setup();
    const a = new Konva.Rect({ id: "a" });
    const b = new Konva.Rect({ id: "b" });
    const c = new Konva.Rect({ id: "c" });

    staticForegroundLayer.add(a);
    staticForegroundLayer.add(b);
    staticForegroundLayer.add(c);
    service.assignOrderOnInsert({ parent: staticForegroundLayer, nodes: [a, b, c], position: "back" });
    patch.mockClear();

    service.registerBundleResolver("ab", (node) => {
      if (node.id() !== "a") {
        return null;
      }

      return [a, b];
    });

    service.bringSelectionToFront([a]);
    expect(staticForegroundLayer.getChildren().map((node) => node.id())).toEqual(["c", "a", "b"]);
    expect(history.canUndo()).toBe(true);
    expect(patch).toHaveBeenLastCalledWith({
      elements: [
        { id: "c", zIndex: fnCreateOrderedZIndex(0) },
        { id: "a", zIndex: fnCreateOrderedZIndex(1) },
        { id: "b", zIndex: fnCreateOrderedZIndex(2) },
      ],
      groups: [],
    });

    expect(history.undo()).toBe(true);
    expect(staticForegroundLayer.getChildren().map((node) => node.id())).toEqual(["a", "b", "c"]);

    expect(history.redo()).toBe(true);
    expect(staticForegroundLayer.getChildren().map((node) => node.id())).toEqual(["c", "a", "b"]);

    service.clearBundleResolvers();
  });

  test("persists runtime groups as groups and runtime shapes as elements in snapshots and patches", () => {
    const { staticForegroundLayer, patch, service } = setup();
    const shape = new Konva.Rect({ id: "shape-1" });
    const group = new Konva.Group({ id: "group:1" });

    staticForegroundLayer.add(shape);
    staticForegroundLayer.add(group);

    service.assignOrderOnInsert({ parent: staticForegroundLayer, nodes: [shape, group], position: "back" });

    expect(patch).toHaveBeenLastCalledWith({
      elements: [{ id: "shape-1", zIndex: fnCreateOrderedZIndex(0) }],
      groups: [{ id: "group:1", zIndex: fnCreateOrderedZIndex(1) }],
    });
    expect(service.snapshotParentOrder(staticForegroundLayer).items).toEqual([
      { id: "shape-1", zIndex: fnCreateOrderedZIndex(0), kind: "element" },
      { id: "group:1", zIndex: fnCreateOrderedZIndex(1), kind: "group" },
    ]);
  });

  test("snapshotParentOrder and restoreParentOrder restore previous order", () => {
    const { staticForegroundLayer, service } = setup();
    const a = new Konva.Rect({ id: "a" });
    const b = new Konva.Rect({ id: "b" });
    const c = new Konva.Rect({ id: "c" });

    staticForegroundLayer.add(a);
    staticForegroundLayer.add(b);
    staticForegroundLayer.add(c);
    service.assignOrderOnInsert({ parent: staticForegroundLayer, nodes: [a, b, c], position: "back" });

    const snapshot = service.snapshotParentOrder(staticForegroundLayer);
    service.sendSelectionToBack([c]);
    expect(staticForegroundLayer.getChildren().map((node) => node.id())).toEqual(["c", "a", "b"]);

    service.restoreParentOrder(snapshot);
    expect(staticForegroundLayer.getChildren().map((node) => node.id())).toEqual(["a", "b", "c"]);
  });

  test("sortChildren uses persisted zIndex ordering and syncs dom order", () => {
    const { staticForegroundLayer, syncDomOrder, service } = setup();
    const a = new Konva.Rect({ id: "a" });
    const b = new Konva.Rect({ id: "b" });
    const c = new Konva.Rect({ id: "c" });

    staticForegroundLayer.add(a);
    staticForegroundLayer.add(b);
    staticForegroundLayer.add(c);

    service.setNodeZIndex(a, fnCreateOrderedZIndex(2));
    service.setNodeZIndex(b, fnCreateOrderedZIndex(0));
    service.setNodeZIndex(c, fnCreateOrderedZIndex(1));

    service.sortChildren(staticForegroundLayer);

    expect(service.getOrderedSiblings(staticForegroundLayer).map((node) => node.id())).toEqual(["b", "c", "a"]);
    expect(staticForegroundLayer.getChildren().map((node) => node.id())).toEqual(["b", "c", "a"]);
    expect(syncDomOrder).toHaveBeenCalledTimes(1);
  });
});
