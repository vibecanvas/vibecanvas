import { afterEach, describe, expect, test, vi } from "vitest";
import type { IPluginContext } from "../../../src/plugins/interface";
import { IframeBrowserWidgetPlugin } from "../../../src/plugins/IframeBrowserWidget.plugin";
import { RenderOrderPlugin } from "../../../src/plugins/RenderOrder.plugin";
import { SceneHydratorPlugin } from "../../../src/plugins/SceneHydrator.plugin";
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

  test("only enables iframe browser DOM pointer events while focused in select mode", async () => {
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
    expect(root.dataset.hostedWidgetFocused).toBe("false");
    expect(root.dataset.hostedWidgetInteractive).toBe("false");
    expect(mount.dataset.hostedWidgetInteractive).toBe("false");
    expect(mount.style.pointerEvents).toBe("none");

    context.setState("focusedId", "browser1");
    await flushCanvasEffects();

    expect(root.dataset.hostedWidgetFocused).toBe("true");
    expect(root.dataset.hostedWidgetInteractive).toBe("true");
    expect(mount.dataset.hostedWidgetInteractive).toBe("true");
    expect(mount.style.pointerEvents).toBe("auto");

    context.setState("mode", CanvasMode.HAND);
    await flushCanvasEffects();

    expect(root.dataset.hostedWidgetFocused).toBe("true");
    expect(root.dataset.hostedWidgetInteractive).toBe("false");
    expect(mount.dataset.hostedWidgetInteractive).toBe("false");
    expect(mount.style.pointerEvents).toBe("none");

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
});
