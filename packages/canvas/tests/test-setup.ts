import Konva from "konva";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
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
  appCapabilities?: Pick<IPluginContext["capabilities"], "uploadImage" | "cloneImage" | "deleteImage" | "notification" | "terminal" | "filetree">;
}) : Promise<TCanvasTestHarness> {
  ensureResizeObserver();

  const container = createTestContainer({ width: args.width, height: args.height });
  const docHandle = args.docHandle ?? createMockDocHandle();

  let disposeRoot: (() => void) | undefined;
  let service: CanvasService | undefined;

  createRoot((dispose) => {
    disposeRoot = dispose;
    service = new CanvasService(
      container,
      docHandle,
      [
        ...args.plugins,
        {
          apply(context) {
            args.initializeScene?.(context);
          },
        },
      ],
      args.appCapabilities,
    );
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
  if (vi.isFakeTimers()) {
    vi.runAllTimers();
  }
  await Promise.resolve();
}

export function createStagePointerEvent(stage: Konva.Stage, args?: { x?: number; y?: number; type?: string }) {
  const evt = new MouseEvent(args?.type ?? "pointermove", {
    bubbles: true,
    clientX: args?.x ?? stage.width() / 2,
    clientY: args?.y ?? stage.height() / 2,
  });

  stage.setPointersPositions(evt);
  return evt;
}

export async function exportStageSnapshot(args: {
  stage: Konva.Stage;
  label: string;
  relativeFilePath: string;
  pixelRatio?: number;
  waitMs?: number;
}) {
  const backgroundLayer = new Konva.Layer({ listening: false });
  const labelLayer = new Konva.Layer({ listening: false });
  const stageWidth = args.stage.width();
  const stageHeight = args.stage.height();

  const background = new Konva.Rect({
    x: 0,
    y: 0,
    width: stageWidth,
    height: stageHeight,
    fill: "#ffffff",
  });

  backgroundLayer.add(background);

  for (let x = 0; x <= stageWidth; x += 50) {
    backgroundLayer.add(new Konva.Line({
      points: [x, 0, x, stageHeight],
      stroke: x % 100 === 0 ? "#d1d5db" : "#e5e7eb",
      strokeWidth: x % 100 === 0 ? 1.5 : 1,
    }));
  }

  for (let y = 0; y <= stageHeight; y += 50) {
    backgroundLayer.add(new Konva.Line({
      points: [0, y, stageWidth, y],
      stroke: y % 100 === 0 ? "#d1d5db" : "#e5e7eb",
      strokeWidth: y % 100 === 0 ? 1.5 : 1,
    }));
  }

  backgroundLayer.add(new Konva.Line({
    points: [0, stageHeight / 2, stageWidth, stageHeight / 2],
    stroke: "#94a3b8",
    strokeWidth: 2,
  }));
  backgroundLayer.add(new Konva.Line({
    points: [stageWidth / 2, 0, stageWidth / 2, stageHeight],
    stroke: "#94a3b8",
    strokeWidth: 2,
  }));

  for (let x = 0; x <= stageWidth; x += 100) {
    backgroundLayer.add(new Konva.Text({
      x: x + 4,
      y: stageHeight - 22,
      text: String(x),
      fontSize: 12,
      fontFamily: "monospace",
      fill: "#475569",
    }));
  }

  for (let y = 0; y <= stageHeight; y += 100) {
    backgroundLayer.add(new Konva.Text({
      x: 4,
      y: y + 4,
      text: String(y),
      fontSize: 12,
      fontFamily: "monospace",
      fill: "#475569",
    }));
  }

  const labelBackground = new Konva.Rect({
    x: 12,
    y: 12,
    width: 520,
    height: 48,
    fill: "rgba(255,255,255,0.9)",
    stroke: "#111111",
    strokeWidth: 1,
  });
  const labelText = new Konva.Text({
    x: 20,
    y: 22,
    text: args.label,
    fontSize: 20,
    fontFamily: "monospace",
    fill: "#111111",
  });

  labelLayer.add(labelBackground);
  labelLayer.add(labelText);
  args.stage.add(backgroundLayer);
  args.stage.add(labelLayer);
  backgroundLayer.moveToBottom();
  labelLayer.moveToTop();
  args.stage.draw();

  if ((args.waitMs ?? 0) > 0) {
    await new Promise((resolvePromise) => setTimeout(resolvePromise, args.waitMs));
    args.stage.draw();
  }

  const dataUrl = args.stage.toDataURL({
    pixelRatio: args.pixelRatio ?? 2,
  });

  backgroundLayer.destroy();
  labelLayer.destroy();
  args.stage.draw();

  const filePath = resolve(process.cwd(), args.relativeFilePath);
  await mkdir(dirname(filePath), { recursive: true });
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  await writeFile(filePath, Buffer.from(base64, "base64"));

  return filePath;
}
