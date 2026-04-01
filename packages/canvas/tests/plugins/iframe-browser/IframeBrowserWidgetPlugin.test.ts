import Konva from "konva";
import { afterEach, describe, expect, test, vi } from "vitest";
import { IframeBrowserWidgetPlugin, RenderOrderPlugin, SceneHydratorPlugin, SelectPlugin, type IPluginContext } from "../../../src/plugins";
import { CanvasMode } from "../../../src/services/canvas/enum";
import {
  createCanvasTestHarness,
  createMockDocHandle,
  flushCanvasEffects,
} from "../../test-setup";

function createBrowserElement(args?: {
  id?: string;
  tabs?: Array<{ id: string; url: string; title: string }>;
  activeTabId?: string;
}) {
  const tabs = args?.tabs ?? [{ id: "tab-1", url: "about:blank#start", title: "Start" }];

  return {
    id: args?.id ?? "browser1",
    x: 40,
    y: 50,
    rotation: 0,
    zIndex: "z00000001",
    parentGroupId: null,
    bindings: [],
    locked: false,
    createdAt: 1,
    updatedAt: 1,
    style: {
      backgroundColor: "#ffffff",
      borderColor: "#d1d5db",
      headerColor: "#f3f4f6",
      opacity: 1,
    },
    data: {
      type: "iframe-browser" as const,
      w: 420,
      h: 320,
      isCollapsed: false,
      tabs,
      activeTabId: args?.activeTabId ?? tabs[0]?.id ?? "",
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("IframeBrowserWidgetPlugin", () => {
  test("keeps the active iframe DOM node stable across tab navigation updates", async () => {
    const docHandle = createMockDocHandle({
      elements: {
        browser1: createBrowserElement(),
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new IframeBrowserWidgetPlugin(), new SceneHydratorPlugin()],
    });

    await flushCanvasEffects();

    const mount = harness.stage.container().querySelector(
      '[data-iframe-browser-widget-id="browser1"]',
    ) as HTMLDivElement | null;
    expect(mount).not.toBeNull();

    const initialIframe = mount?.querySelector("iframe") as HTMLIFrameElement | null;
    expect(initialIframe).not.toBeNull();
    initialIframe!.dataset.persisted = "yes";

    const addressBar = mount?.querySelector('input[type="text"]') as HTMLInputElement | null;
    expect(addressBar).not.toBeNull();
    addressBar!.value = "about:blank#next";
    addressBar!.dispatchEvent(new Event("input", { bubbles: true }));
    addressBar!.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));

    await flushCanvasEffects();

    const iframes = mount?.querySelectorAll("iframe") ?? [];
    expect(iframes).toHaveLength(1);
    expect(iframes[0]).toBe(initialIframe);
    expect(initialIframe?.dataset.persisted).toBe("yes");
    expect(docHandle.doc().elements.browser1?.data.tabs[0]?.url).toBe("about:blank#next");

    harness.destroy();
  });

  test("recreates an iframe when a closed tab id is reused", async () => {
    const docHandle = createMockDocHandle({
      elements: {
        browser1: createBrowserElement({
          tabs: [
            { id: "tab-1", url: "about:blank#one", title: "One" },
            { id: "tab-2", url: "about:blank#two", title: "Two" },
          ],
          activeTabId: "tab-2",
        }),
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new IframeBrowserWidgetPlugin(), new SceneHydratorPlugin()],
    });

    await flushCanvasEffects();

    const mount = harness.stage.container().querySelector(
      '[data-iframe-browser-widget-id="browser1"]',
    ) as HTMLDivElement | null;
    expect(mount).not.toBeNull();
    expect(mount?.querySelectorAll("iframe")).toHaveLength(2);

    const closeButtons = mount?.querySelectorAll('[aria-label="Close tab"]') ?? [];
    expect(closeButtons).toHaveLength(2);
    (closeButtons[1] as HTMLButtonElement).click();

    await flushCanvasEffects();

    expect(mount?.querySelectorAll("iframe")).toHaveLength(1);
    expect(docHandle.doc().elements.browser1?.data.tabs.map((tab) => tab.id)).toEqual(["tab-1"]);

    const randomUUIDSpy = vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("tab-2");
    const newTabButton = mount?.querySelector('[aria-label="New tab"]') as HTMLButtonElement | null;
    expect(newTabButton).not.toBeNull();
    newTabButton!.click();

    await flushCanvasEffects();

    expect(randomUUIDSpy).toHaveBeenCalled();
    expect(docHandle.doc().elements.browser1?.data.tabs.map((tab) => tab.id)).toEqual(["tab-1", "tab-2"]);
    expect(mount?.querySelectorAll("iframe")).toHaveLength(2);

    harness.destroy();
  });

  test("unmounts every browser widget mount during destroy", async () => {
    const docHandle = createMockDocHandle({
      elements: {
        browser1: createBrowserElement({ id: "browser1" }),
        browser2: createBrowserElement({ id: "browser2" }),
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new IframeBrowserWidgetPlugin(), new SceneHydratorPlugin()],
    });

    await flushCanvasEffects();

    expect(document.querySelectorAll("[data-iframe-browser-widget-id]")).toHaveLength(2);

    harness.destroy();

    expect(document.querySelectorAll("[data-iframe-browser-widget-id]")).toHaveLength(0);
  });

  test("browser DOM stays transparent before focus, becomes interactive when focused, and disables DOM pointer events while transformer is visible", async () => {
    let context!: IPluginContext;
    const docHandle = createMockDocHandle({
      elements: {
        browser1: createBrowserElement(),
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new IframeBrowserWidgetPlugin(), new SceneHydratorPlugin()],
      initializeScene: (ctx) => {
        context = ctx;
      },
    });

    await flushCanvasEffects();

    const mount = harness.stage.container().querySelector(
      '[data-iframe-browser-widget-id="browser1"]',
    ) as HTMLDivElement;
    const root = mount.querySelector('[data-hosted-widget-root="true"]') as HTMLDivElement;
    const newTabButton = mount.querySelector('[aria-label="New tab"]') as HTMLButtonElement;
    const addressBar = mount.querySelector('input[type="text"]') as HTMLInputElement;
    expect(root.dataset.hostedWidgetFocused).toBe("false");
    expect(root.dataset.hostedWidgetInteractive).toBe("false");
    expect(mount.dataset.hostedWidgetInteractive).toBe("false");
    expect(mount.style.pointerEvents).toBe("none");
    expect(mount.hasAttribute("inert")).toBe(true);
    expect(newTabButton.style.pointerEvents).toBe("none");
    expect(addressBar.style.pointerEvents).toBe("none");

    context.setState("focusedId", "browser1");
    await flushCanvasEffects();

    expect(root.dataset.hostedWidgetFocused).toBe("true");
    expect(root.dataset.hostedWidgetInteractive).toBe("true");
    expect(mount.dataset.hostedWidgetInteractive).toBe("true");
    expect(mount.style.pointerEvents).toBe("auto");
    expect(mount.hasAttribute("inert")).toBe(false);
    expect(newTabButton.style.pointerEvents).toBe("auto");
    expect(addressBar.style.pointerEvents).toBe("auto");

    const resizeButton = mount.querySelector('[aria-label="Show resize handles"]') as HTMLButtonElement;
    expect(resizeButton).not.toBeNull();
    resizeButton.click();
    await flushCanvasEffects();

    expect(root.dataset.hostedWidgetFocused).toBe("true");
    expect(root.dataset.hostedWidgetInteractive).toBe("false");
    expect(mount.dataset.hostedWidgetInteractive).toBe("false");
    expect(mount.style.pointerEvents).toBe("none");
    expect(mount.hasAttribute("inert")).toBe(true);
    expect(newTabButton.style.pointerEvents).toBe("none");
    expect(addressBar.style.pointerEvents).toBe("none");

    context.setState("mode", CanvasMode.HAND);
    await flushCanvasEffects();

    expect(root.dataset.hostedWidgetFocused).toBe("true");
    expect(root.dataset.hostedWidgetInteractive).toBe("false");
    expect(mount.dataset.hostedWidgetInteractive).toBe("false");
    expect(mount.style.pointerEvents).toBe("none");
    expect(mount.hasAttribute("inert")).toBe(true);
    expect(newTabButton.style.pointerEvents).toBe("none");
    expect(addressBar.style.pointerEvents).toBe("none");

    harness.destroy();
  });

  test("first focus transition on iframe browser focuses the browser root container", async () => {
    vi.useFakeTimers();

    try {
      let context!: IPluginContext;
      const docHandle = createMockDocHandle({
        elements: {
          browser1: createBrowserElement(),
        },
      });

      const harness = await createCanvasTestHarness({
        docHandle,
        plugins: [new RenderOrderPlugin(), new IframeBrowserWidgetPlugin(), new SceneHydratorPlugin()],
        initializeScene: (ctx) => {
          context = ctx;
        },
      });

      await flushCanvasEffects();
      context.setState("focusedId", "browser1");
      await flushCanvasEffects();

      const mount = harness.stage.container().querySelector(
        '[data-iframe-browser-widget-id="browser1"]',
      ) as HTMLDivElement | null;
      const root = mount?.querySelector('[data-hosted-widget-focus-root="true"]') as HTMLDivElement | null;

      expect(root).not.toBeNull();
      expect(document.activeElement).toBe(root);

      harness.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  test("browser focus click does not arm iframe DOM until pointer release", async () => {
    let context!: IPluginContext;
    const docHandle = createMockDocHandle({
      elements: {
        browser1: createBrowserElement(),
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new SelectPlugin(), new IframeBrowserWidgetPlugin(), new SceneHydratorPlugin()],
      initializeScene: (ctx) => {
        context = ctx;
      },
    });

    await flushCanvasEffects();

    const mount = harness.stage.container().querySelector(
      '[data-iframe-browser-widget-id="browser1"]',
    ) as HTMLDivElement;
    const iframe = mount.querySelector("iframe") as HTMLIFrameElement;
    const browserNode = harness.staticForegroundLayer.findOne((candidate: Konva.Node) => candidate.id() === "browser1") as Konva.Rect | null;

    expect(browserNode).not.toBeNull();
    expect(mount.style.pointerEvents).toBe("none");
    expect(iframe.style.pointerEvents).toBe("none");
    expect(context.state.selection).toHaveLength(0);
    expect(context.state.focusedId).toBeNull();

    browserNode!.fire("pointerdown", {
      target: browserNode,
      currentTarget: browserNode,
      evt: new MouseEvent("pointerdown", { bubbles: true, button: 0, clientX: 120, clientY: 120 }),
    });

    await flushCanvasEffects();

    expect(context.state.selection.map((node) => node.id())).toEqual(["browser1"]);
    expect(context.state.focusedId).toBe("browser1");

    expect(mount.dataset.hostedWidgetInteractive).toBe("false");
    expect(mount.style.pointerEvents).toBe("none");
    expect(iframe.style.pointerEvents).toBe("none");

    window.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientX: 120, clientY: 120 }));
    await flushCanvasEffects();

    expect(mount.style.pointerEvents).toBe("auto");
    expect(iframe.style.pointerEvents).toBe("auto");

    harness.destroy();
  });

  test("bridges header drag from DOM back into browser Konva node", async () => {
    const docHandle = createMockDocHandle({
      elements: {
        browser1: createBrowserElement(),
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new IframeBrowserWidgetPlugin(), new SceneHydratorPlugin()],
    });

    await flushCanvasEffects();

    const header = harness.stage.container().querySelector("[data-hosted-widget-header='true']") as HTMLDivElement | null;
    expect(header).not.toBeNull();

    header?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
    window.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 150, clientY: 140 }));
    window.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientX: 150, clientY: 140 }));

    await flushCanvasEffects();

    const updated = docHandle.doc().elements.browser1;
    expect(updated?.x).toBe(90);
    expect(updated?.y).toBe(90);

    harness.destroy();
  });

  test("browser DOM drag stops on window blur", async () => {
    const docHandle = createMockDocHandle({
      elements: {
        browser1: createBrowserElement(),
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new IframeBrowserWidgetPlugin(), new SceneHydratorPlugin()],
    });

    await flushCanvasEffects();

    const header = harness.stage.container().querySelector("[data-hosted-widget-header='true']") as HTMLDivElement | null;
    const browserNode = harness.staticForegroundLayer.findOne((candidate: Konva.Node) => candidate.id() === "browser1") as Konva.Rect | null;
    expect(header).not.toBeNull();
    expect(browserNode).not.toBeNull();

    header?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
    window.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 140, clientY: 130 }));
    expect(browserNode!.x()).toBe(80);
    expect(browserNode!.y()).toBe(80);

    window.dispatchEvent(new Event("blur"));
    window.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 170, clientY: 160 }));
    await flushCanvasEffects();

    expect(browserNode!.x()).toBe(80);
    expect(browserNode!.y()).toBe(80);

    window.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientX: 170, clientY: 160 }));
    await flushCanvasEffects();
    harness.destroy();
  });

  test("browser DOM drag stops on pointercancel", async () => {
    const docHandle = createMockDocHandle({
      elements: {
        browser1: createBrowserElement(),
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new IframeBrowserWidgetPlugin(), new SceneHydratorPlugin()],
    });

    await flushCanvasEffects();

    const header = harness.stage.container().querySelector("[data-hosted-widget-header='true']") as HTMLDivElement | null;
    const browserNode = harness.staticForegroundLayer.findOne((candidate: Konva.Node) => candidate.id() === "browser1") as Konva.Rect | null;
    expect(header).not.toBeNull();
    expect(browserNode).not.toBeNull();

    header?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
    window.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 130, clientY: 120 }));
    expect(browserNode!.x()).toBe(70);
    expect(browserNode!.y()).toBe(70);

    window.dispatchEvent(new MouseEvent("pointercancel", { bubbles: true, clientX: 130, clientY: 120 }));
    window.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 160, clientY: 150 }));
    await flushCanvasEffects();

    expect(browserNode!.x()).toBe(70);
    expect(browserNode!.y()).toBe(70);

    window.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientX: 160, clientY: 150 }));
    await flushCanvasEffects();
    harness.destroy();
  });

  test("native Konva drag persists iframe browser position across reload", async () => {
    const docHandle = createMockDocHandle({
      elements: {
        browser1: createBrowserElement(),
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new IframeBrowserWidgetPlugin(), new SceneHydratorPlugin()],
    });

    await flushCanvasEffects();

    const node = harness.staticForegroundLayer.findOne("#browser1") as Konva.Rect | null;
    expect(node).not.toBeNull();

    node!.fire("dragstart", { target: node, currentTarget: node, evt: new MouseEvent("dragstart", { bubbles: true }) });
    node!.position({ x: 170, y: 190 });
    node!.fire("dragmove", { target: node, currentTarget: node, evt: new MouseEvent("dragmove", { bubbles: true }) });
    node!.fire("dragend", { target: node, currentTarget: node, evt: new MouseEvent("dragend", { bubbles: true }) });

    await flushCanvasEffects();

    expect(node!.x()).toBe(170);
    expect(node!.y()).toBe(190);
    expect(docHandle.doc().elements.browser1?.x).toBe(170);
    expect(docHandle.doc().elements.browser1?.y).toBe(190);

    harness.destroy();

    const reloadedHarness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new IframeBrowserWidgetPlugin(), new SceneHydratorPlugin()],
    });

    await flushCanvasEffects();

    const reloadedNode = reloadedHarness.staticForegroundLayer.findOne("#browser1") as Konva.Rect | null;
    expect(reloadedNode).not.toBeNull();
    expect(reloadedNode!.x()).toBe(170);
    expect(reloadedNode!.y()).toBe(190);

    reloadedHarness.destroy();
  });
});
