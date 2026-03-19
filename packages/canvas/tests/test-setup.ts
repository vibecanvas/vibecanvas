import Konva from "konva";
import type { DocHandle } from "@automerge/automerge-repo";
import type { TCanvasDoc } from "@vibecanvas/shell/automerge/index";
import { createRoot } from "solid-js";
import { vi } from "vitest";
import type { IPlugin } from "../src/plugins/interface";
import type { IPluginContext } from "../src/plugins/interface";
import { CanvasService } from "../src/services/canvas/Canvas.service";

type TCanvasTestHarness = {
  service: CanvasService;
  stage: Konva.Stage;
  staticBackgroundLayer: Konva.Layer;
  staticForegroundLayer: Konva.Layer;
  dynamicLayer: Konva.Layer;
  destroy: () => void;
};

export function ensureResizeObserver() {
  if (typeof ResizeObserver !== "undefined") {
    return;
  }

  class MockResizeObserver {
    observe() {}
    disconnect() {}
  }

  vi.stubGlobal("ResizeObserver", MockResizeObserver);
}

export function createMockDocHandle(overrides?: Partial<TCanvasDoc>): DocHandle<TCanvasDoc> {
  const docState: TCanvasDoc = {
    id: "test-doc",
    name: "test-doc",
    elements: {},
    groups: {},
    ...overrides,
  };

  return {
    doc: () => docState,
    change: (callback) => {
      callback(docState);
    },
  } as DocHandle<TCanvasDoc>;
}

export function createTestContainer(args?: { width?: number; height?: number }) {
  const width = args?.width ?? 800;
  const height = args?.height ?? 600;
  const container = document.createElement("div");

  Object.defineProperty(container, "clientWidth", { configurable: true, value: width });
  Object.defineProperty(container, "clientHeight", { configurable: true, value: height });

  document.body.appendChild(container);

  return container;
}

export async function createCanvasTestHarness(args: {
  plugins: IPlugin[];
  initializeScene?: (context: IPluginContext) => void;
  docHandle?: DocHandle<TCanvasDoc>;
  width?: number;
  height?: number;
}) : Promise<TCanvasTestHarness> {
  ensureResizeObserver();

  const container = createTestContainer({ width: args.width, height: args.height });
  const docHandle = args.docHandle ?? createMockDocHandle();

  let disposeRoot: (() => void) | undefined;
  let service: CanvasService | undefined;

  createRoot((dispose) => {
    disposeRoot = dispose;
    service = new CanvasService(container, docHandle, [
      ...args.plugins,
      {
        apply(context) {
          args.initializeScene?.(context);
        },
      },
    ]);
  });

  await service!.initialized;

  const stage = (window as typeof window & { stage?: Konva.Stage }).stage ?? null;
  if (!stage) {
    throw new Error("CanvasService did not expose stage on window");
  }

  const [staticBackgroundLayer, staticForegroundLayer, dynamicLayer] = stage.getLayers();

  if (!staticBackgroundLayer || !staticForegroundLayer || !dynamicLayer) {
    throw new Error("CanvasService did not initialize expected layers");
  }

  return {
    service: service!,
    stage,
    staticBackgroundLayer,
    staticForegroundLayer,
    dynamicLayer,
    destroy: () => {
      service?.destroy();
      disposeRoot?.();
      container.remove();
    },
  };
}

export async function flushCanvasEffects() {
  await Promise.resolve();
  vi.runAllTimers();
  await Promise.resolve();
}
