import Konva from "konva";
import { describe, expect, test, vi } from "vitest";
import type { IPluginContext } from "../../../src/plugins/interface";
import { HostedSolidWidgetPlugin } from "../../../src/plugins/HostedSolidWidget.plugin";
import { RenderOrderPlugin } from "../../../src/plugins/RenderOrder.plugin";
import { SceneHydratorPlugin } from "../../../src/plugins/SceneHydrator.plugin";
import { TransformPlugin } from "../../../src/plugins/Transform.plugin";
import {
  createCanvasTestHarness,
  createMockDocHandle,
  flushCanvasEffects,
} from "../../test-setup";

describe("HostedSolidWidgetPlugin", () => {
  test("hydrates hosted widgets into Konva rects and one shared DOM root", async () => {
    const docHandle = createMockDocHandle({
      elements: {
        chat1: {
          id: "chat1",
          x: 40,
          y: 50,
          rotation: 0,
          zIndex: "z00000001",
          parentGroupId: null,
          bindings: [],
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {},
          data: { type: "chat", w: 420, h: 320, isCollapsed: false },
        },
        tree1: {
          id: "tree1",
          x: 120,
          y: 80,
          rotation: 0,
          zIndex: "z00000002",
          parentGroupId: null,
          bindings: [],
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {},
          data: { type: "filetree", w: 420, h: 340, isCollapsed: false, globPattern: null },
        },
        terminal1: {
          id: "terminal1",
          x: 200,
          y: 120,
          rotation: 0,
          zIndex: "z00000003",
          parentGroupId: null,
          bindings: [],
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {},
          data: { type: "terminal", w: 460, h: 300, isCollapsed: false, workingDirectory: "/tmp/demo" },
        },
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new HostedSolidWidgetPlugin(), new SceneHydratorPlugin()],
    });

    await flushCanvasEffects();

    const hostedNodes = harness.staticForegroundLayer.find((node: Konva.Node) => {
      return node.getAttr("vcHostedWidget") === true;
    });
    expect(hostedNodes).toHaveLength(3);

    const overlayRoot = harness.stage.container().querySelector(".vc-world-widgets-root") as HTMLDivElement | null;
    expect(overlayRoot).not.toBeNull();
    expect(overlayRoot?.querySelectorAll("[data-hosted-widget-id]")).toHaveLength(3);

    harness.destroy();
  });

  test("bridges header drag from DOM back into hosted Konva node", async () => {
    const docHandle = createMockDocHandle({
      elements: {
        chat1: {
          id: "chat1",
          x: 20,
          y: 30,
          rotation: 0,
          zIndex: "z00000001",
          parentGroupId: null,
          bindings: [],
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {},
          data: { type: "chat", w: 420, h: 320, isCollapsed: false },
        },
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new HostedSolidWidgetPlugin(), new SceneHydratorPlugin()],
    });

    await flushCanvasEffects();

    const header = harness.stage.container().querySelector("[data-hosted-widget-header='true']") as HTMLDivElement | null;
    expect(header).not.toBeNull();

    header?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
    window.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 150, clientY: 140 }));
    window.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientX: 150, clientY: 140 }));

    await flushCanvasEffects();

    const updated = docHandle.doc().elements.chat1;
    expect(updated?.x).toBe(70);
    expect(updated?.y).toBe(70);

    harness.destroy();
  });

  test("mirrors persisted widget order into DOM mount order", async () => {
    const docHandle = createMockDocHandle({
      elements: {
        late: {
          id: "late",
          x: 0,
          y: 0,
          rotation: 0,
          zIndex: "z00000009",
          parentGroupId: null,
          bindings: [],
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {},
          data: { type: "chat", w: 300, h: 240, isCollapsed: false },
        },
        early: {
          id: "early",
          x: 0,
          y: 0,
          rotation: 0,
          zIndex: "z00000001",
          parentGroupId: null,
          bindings: [],
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {},
          data: { type: "terminal", w: 320, h: 220, isCollapsed: false, workingDirectory: "." },
        },
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new HostedSolidWidgetPlugin(), new SceneHydratorPlugin()],
    });

    await flushCanvasEffects();

    const mountedIds = [...harness.stage.container().querySelectorAll("[data-hosted-widget-id]")].map((node) => {
      return (node as HTMLElement).dataset.hostedWidgetId;
    });

    expect(mountedIds).toEqual(["early", "late"]);

    harness.destroy();
  });

  test("cleans hosted DOM mounts on destroy", async () => {
    const docHandle = createMockDocHandle({
      elements: {
        chat1: {
          id: "chat1",
          x: 20,
          y: 20,
          rotation: 0,
          zIndex: "z00000001",
          parentGroupId: null,
          bindings: [],
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {},
          data: { type: "chat", w: 320, h: 220, isCollapsed: false },
        },
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new HostedSolidWidgetPlugin(), new SceneHydratorPlugin()],
    });

    await flushCanvasEffects();
    expect(harness.stage.container().querySelectorAll("[data-hosted-widget-id]")).toHaveLength(1);

    harness.destroy();

    expect(document.querySelectorAll("[data-hosted-widget-id]")).toHaveLength(0);
  });

  test("keeps hosted transformer hidden until header double click", async () => {
    let context!: IPluginContext;
    const docHandle = createMockDocHandle({
      elements: {
        terminal1: {
          id: "terminal1",
          x: 20,
          y: 20,
          rotation: 0,
          zIndex: "z00000001",
          parentGroupId: null,
          bindings: [],
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {},
          data: { type: "terminal", w: 320, h: 220, isCollapsed: false, workingDirectory: "." },
        },
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new HostedSolidWidgetPlugin(), new TransformPlugin(), new SceneHydratorPlugin()],
      initializeScene: (ctx) => {
        context = ctx;
      },
    });

    await flushCanvasEffects();

    const node = harness.staticForegroundLayer.findOne("#terminal1") as Konva.Rect;
    const transformer = harness.dynamicLayer.findOne((candidate: Konva.Node) => candidate instanceof Konva.Transformer) as Konva.Transformer;
    context.setState("selection", [node]);
    await flushCanvasEffects();

    expect(transformer.nodes()).toHaveLength(0);

    const header = harness.stage.container().querySelector("[data-hosted-widget-header='true']") as HTMLDivElement;
    header.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    await flushCanvasEffects();

    expect(transformer.nodes()).toHaveLength(1);
    expect(transformer.nodes()[0]?.id()).toBe("terminal1");

    harness.destroy();
  });

  test("applies DOM matrix transform so hosted content scales with camera zoom", async () => {
    let context!: IPluginContext;
    const docHandle = createMockDocHandle({
      elements: {
        terminal1: {
          id: "terminal1",
          x: 30,
          y: 40,
          rotation: 0,
          zIndex: "z00000001",
          parentGroupId: null,
          bindings: [],
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {},
          data: { type: "terminal", w: 320, h: 220, isCollapsed: false, workingDirectory: "." },
        },
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new HostedSolidWidgetPlugin(), new SceneHydratorPlugin()],
      initializeScene: (ctx) => {
        context = ctx;
      },
    });

    await flushCanvasEffects();

    const mount = harness.stage.container().querySelector("[data-hosted-widget-id='terminal1']") as HTMLDivElement;
    const before = mount.style.transform;

    context.camera.zoomAtScreenPoint(0.5, { x: 100, y: 100 });
    context.hooks.cameraChange.call();
    await flushCanvasEffects();

    const after = mount.style.transform;
    expect(before.includes("scale(")).toBe(true);
    expect(after.includes("scale(")).toBe(true);
    expect(after).not.toBe(before);

    harness.destroy();
  });

  test("close button removes hosted terminal and runs terminal cleanup callback", async () => {
    const beforeRemove = vi.fn();
    const docHandle = createMockDocHandle({
      elements: {
        terminal1: {
          id: "terminal1",
          x: 30,
          y: 40,
          rotation: 0,
          zIndex: "z00000001",
          parentGroupId: null,
          bindings: [],
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {},
          data: { type: "terminal", w: 320, h: 220, isCollapsed: false, workingDirectory: "." },
        },
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new HostedSolidWidgetPlugin(), new SceneHydratorPlugin()],
      appCapabilities: {
        widgetRenderers: {
          terminal: ({ registerBeforeRemove }) => {
            registerBeforeRemove?.(beforeRemove);
            return "terminal" as unknown as never;
          },
        },
      },
    });

    await flushCanvasEffects();

    const closeButton = harness.stage.container().querySelector('[aria-label="Close widget"]') as HTMLButtonElement;
    closeButton.click();
    await flushCanvasEffects();

    expect(beforeRemove).toHaveBeenCalledTimes(1);
    expect(docHandle.doc().elements.terminal1).toBeUndefined();
    expect(harness.stage.container().querySelector('[data-hosted-widget-id="terminal1"]')).toBeNull();

    harness.destroy();
  });

  test("resizing hosted terminal bakes scale into dimensions instead of leaving skewed scale on node", async () => {
    let context!: IPluginContext;
    const docHandle = createMockDocHandle({
      elements: {
        terminal1: {
          id: "terminal1",
          x: 30,
          y: 40,
          rotation: 0,
          zIndex: "z00000001",
          parentGroupId: null,
          bindings: [],
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {},
          data: { type: "terminal", w: 320, h: 220, isCollapsed: false, workingDirectory: "." },
        },
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new HostedSolidWidgetPlugin(), new TransformPlugin(), new SceneHydratorPlugin()],
      initializeScene: (ctx) => {
        context = ctx;
      },
    });

    await flushCanvasEffects();

    const node = harness.staticForegroundLayer.findOne("#terminal1") as Konva.Rect;
    const transformer = harness.dynamicLayer.findOne((candidate: Konva.Node) => candidate instanceof Konva.Transformer) as Konva.Transformer;
    const header = harness.stage.container().querySelector("[data-hosted-widget-header='true']") as HTMLDivElement;
    header.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    await flushCanvasEffects();

    context.setState("selection", [node]);
    node.scale({ x: 1.5, y: 1.25 });
    transformer.fire("transformstart");
    transformer.fire("transformend");
    await flushCanvasEffects();

    const updated = docHandle.doc().elements.terminal1;
    expect(Math.round(updated!.data.w)).toBe(480);
    expect(Math.round(updated!.data.h)).toBe(275);
    expect(node.scaleX()).toBe(1);
    expect(node.scaleY()).toBe(1);

    const mount = harness.stage.container().querySelector('[data-hosted-widget-id="terminal1"]') as HTMLDivElement;
    expect(mount.style.transform.includes("matrix(")).toBe(false);
    expect(mount.style.width).toBe("480px");
    expect(mount.style.height).toBe("275px");

    harness.destroy();
  });
});
