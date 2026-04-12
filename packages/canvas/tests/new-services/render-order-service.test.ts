import Konva from "konva";
import { describe, expect, test } from "vitest";
import { HistoryService } from "../../src/new-services/history/HistoryService";
import { RenderService } from "../../src/new-services/render/RenderService";
import { RenderOrderService } from "../../src/new-services/render-order/RenderOrderService";
import { CrdtService } from "../../src/new-services/crdt/CrdtService";
import { createMockDocHandle, createTestContainer, ensureResizeObserver } from "../test-setup";
import { createOrderedZIndex } from "../../src/core/render-order";

function setup() {
  ensureResizeObserver();
  const container = createTestContainer({ width: 800, height: 600 }) as HTMLDivElement;
  const docHandle = createMockDocHandle();
  const render = new RenderService({ container, docHandle });
  render.start();
  const crdt = new CrdtService({ docHandle });
  const history = new HistoryService();
  const service = new RenderOrderService({ crdt, history, render });
  return { container, docHandle, render, crdt, history, service };
}

describe("RenderOrderService", () => {
  test("assignOrderOnInsert persists front and back placement", () => {
    const { container, docHandle, render, service } = setup();
    const a = new Konva.Rect({ id: "a" });
    const b = new Konva.Rect({ id: "b" });
    const c = new Konva.Rect({ id: "c" });
    render.staticForegroundLayer.add(a);
    render.staticForegroundLayer.add(b);
    render.staticForegroundLayer.add(c);

    service.assignOrderOnInsert({ parent: render.staticForegroundLayer, nodes: [a, b, c], position: "back" });
    expect(render.staticForegroundLayer.getChildren().map((node) => node.id())).toEqual(["a", "b", "c"]);
    expect(docHandle.doc().elements.a.zIndex).toBe(createOrderedZIndex(0));

    const d = new Konva.Rect({ id: "d" });
    render.staticForegroundLayer.add(d);
    service.assignOrderOnInsert({ parent: render.staticForegroundLayer, nodes: [d], position: "front" });
    expect(render.staticForegroundLayer.getChildren().map((node) => node.id())).toEqual(["a", "b", "c", "d"]);
    expect(docHandle.doc().elements.d.zIndex).toBe(createOrderedZIndex(3));

    render.stop();
    container.remove();
  });

  test("bundle resolver groups nodes for front movement and undo redo", () => {
    const { container, render, history, service } = setup();
    const a = new Konva.Rect({ id: "a" });
    const b = new Konva.Rect({ id: "b" });
    const c = new Konva.Rect({ id: "c" });
    render.staticForegroundLayer.add(a);
    render.staticForegroundLayer.add(b);
    render.staticForegroundLayer.add(c);
    service.assignOrderOnInsert({ parent: render.staticForegroundLayer, nodes: [a, b, c], position: "back" });

    service.registerBundleResolver("ab", (node) => {
      if (node.id() !== "a") {
        return null;
      }
      return [a, b];
    });

    service.bringSelectionToFront([a]);
    expect(render.staticForegroundLayer.getChildren().map((node) => node.id())).toEqual(["c", "a", "b"]);

    history.undo();
    expect(render.staticForegroundLayer.getChildren().map((node) => node.id())).toEqual(["a", "b", "c"]);
    history.redo();
    expect(render.staticForegroundLayer.getChildren().map((node) => node.id())).toEqual(["c", "a", "b"]);

    service.clearBundleResolvers();
    render.stop();
    container.remove();
  });

  test("snapshotParentOrder and restoreParentOrder restore previous order", () => {
    const { container, render, service } = setup();
    const a = new Konva.Rect({ id: "a" });
    const b = new Konva.Rect({ id: "b" });
    const c = new Konva.Rect({ id: "c" });
    render.staticForegroundLayer.add(a);
    render.staticForegroundLayer.add(b);
    render.staticForegroundLayer.add(c);
    service.assignOrderOnInsert({ parent: render.staticForegroundLayer, nodes: [a, b, c], position: "back" });

    const snapshot = service.snapshotParentOrder(render.staticForegroundLayer);
    service.sendSelectionToBack([c]);
    expect(render.staticForegroundLayer.getChildren().map((node) => node.id())).toEqual(["c", "a", "b"]);

    service.restoreParentOrder(snapshot);
    expect(render.staticForegroundLayer.getChildren().map((node) => node.id())).toEqual(["a", "b", "c"]);

    render.stop();
    container.remove();
  });
});
