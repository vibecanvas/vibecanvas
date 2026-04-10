import Konva from "konva";
import { describe, expect, test } from "vitest";
import type { TCanvasDoc, TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc";
import { ContextMenuPlugin, GroupPlugin, RenderOrderPlugin, SceneHydratorPlugin, Shape2dPlugin, type IPluginContext } from "../../../src/plugins";
import { createCanvasTestHarness, createMockDocHandle, flushCanvasEffects } from "../../test-setup";

function createRectElement(overrides?: Partial<TElement>): TElement {
  return {
    id: "element-1",
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
      type: "rect",
      w: 100,
      h: 80,
    },
    style: {
      backgroundColor: "#f00",
    },
    ...overrides,
  };
}

function createGroup(overrides?: Partial<TGroup>): TGroup {
  return {
    id: "group-1",
    parentGroupId: null,
    zIndex: "z00000000",
    locked: false,
    createdAt: 1,
    ...overrides,
  };
}

describe("RenderOrderPlugin", () => {
  test("hydrates mixed top-level groups and elements in zIndex order", async () => {
    const group = createGroup({ id: "group-top", zIndex: "z00000001" });
    const bottomRect = createRectElement({ id: "rect-bottom", zIndex: "z00000000" });
    const topRect = createRectElement({ id: "rect-top", zIndex: "z00000002", x: 200 });
    const docHandle = createMockDocHandle({
      groups: { [group.id]: group },
      elements: {
        [bottomRect.id]: bottomRect,
        [topRect.id]: topRect,
      },
    }) as unknown as { doc(): TCanvasDoc; change(cb: (doc: TCanvasDoc) => void): void };

    const harness = await createCanvasTestHarness({
      docHandle: docHandle as any,
      plugins: [new RenderOrderPlugin(), new Shape2dPlugin(), new GroupPlugin(), new SceneHydratorPlugin()],
    });

    const orderedIds = harness.staticForegroundLayer.getChildren()
      .filter((node) => node instanceof Konva.Group || node instanceof Konva.Shape)
      .map((node) => node.id());

    expect(orderedIds).toEqual([bottomRect.id, group.id, topRect.id]);
    harness.destroy();
  });

  test("render order capability brings selected shape to front", async () => {
    const backRect = createRectElement({ id: "rect-back", x: 40, y: 40, zIndex: "z00000000" });
    const frontRect = createRectElement({ id: "rect-front", x: 60, y: 60, zIndex: "z00000001", style: { backgroundColor: "#00f" } });
    let pluginContext!: IPluginContext;
    const docHandle = createMockDocHandle({
      elements: {
        [backRect.id]: backRect,
        [frontRect.id]: frontRect,
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new Shape2dPlugin(), new SceneHydratorPlugin()],
      initializeScene(context) {
        pluginContext = context;
      },
    });

    const backNode = harness.staticForegroundLayer.findOne<Konva.Rect>(`#${backRect.id}`);
    expect(backNode).toBeTruthy();

    pluginContext.capabilities.renderOrder?.bringSelectionToFront([backNode!]);
    await flushCanvasEffects();

    const orderedIds = harness.staticForegroundLayer.getChildren()
      .filter((node) => node instanceof Konva.Shape)
      .map((node) => node.id());

    expect(orderedIds.at(-1)).toBe(backRect.id);
    expect(docHandle.doc().elements[backRect.id]?.zIndex).toBe("z00000001");
    harness.destroy();
  });

  test("reordering does not mutate createdAt or updatedAt metadata", async () => {
    const backRect = createRectElement({
      id: "rect-back",
      x: 40,
      y: 40,
      zIndex: "z00000000",
      createdAt: 111,
      updatedAt: 222,
    });
    const frontRect = createRectElement({
      id: "rect-front",
      x: 60,
      y: 60,
      zIndex: "z00000001",
      createdAt: 333,
      updatedAt: 444,
    });
    let pluginContext!: IPluginContext;
    const docHandle = createMockDocHandle({
      elements: {
        [backRect.id]: backRect,
        [frontRect.id]: frontRect,
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new Shape2dPlugin(), new SceneHydratorPlugin()],
      initializeScene(context) {
        pluginContext = context;
      },
    });

    const backNode = harness.staticForegroundLayer.findOne<Konva.Rect>(`#${backRect.id}`);
    expect(backNode).toBeTruthy();

    pluginContext.capabilities.renderOrder?.bringSelectionToFront([backNode!]);
    await flushCanvasEffects();

    expect(docHandle.doc().elements[backRect.id]?.createdAt).toBe(111);
    expect(docHandle.doc().elements[backRect.id]?.updatedAt).toBe(222);
    expect(docHandle.doc().elements[frontRect.id]?.createdAt).toBe(333);
    expect(docHandle.doc().elements[frontRect.id]?.updatedAt).toBe(444);

    harness.destroy();
  });

  test("context menu opens item actions on right click", async () => {
    const backRect = createRectElement({ id: "rect-back", x: 40, y: 40, zIndex: "z00000000" });
    const frontRect = createRectElement({ id: "rect-front", x: 60, y: 60, zIndex: "z00000001", style: { backgroundColor: "#00f" } });
    const docHandle = createMockDocHandle({
      elements: {
        [backRect.id]: backRect,
        [frontRect.id]: frontRect,
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new Shape2dPlugin(), new ContextMenuPlugin(), new SceneHydratorPlugin()],
    });

    const menuEvent = new MouseEvent("contextmenu", {
      bubbles: true,
      clientX: 45,
      clientY: 45,
      button: 2,
    });
    harness.stage.container().dispatchEvent(menuEvent);
    await flushCanvasEffects();

    const menuButtons = [...document.querySelectorAll("[role='menuitem']")];
    const bringToFrontButton = menuButtons.find((button) => button.textContent === "Bring to front");
    expect(bringToFrontButton).toBeTruthy();
    harness.destroy();
  });
});
