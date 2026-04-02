import Konva from "konva";
import { describe, expect, test, vi } from "vitest";
import type { TTerminalSafeClient } from "../../../src/services/canvas/interface";

vi.mock("ghostty-web", () => {
  class MockGhosttyTerminal {
    rows = 24;
    cols = 80;
    element: HTMLDivElement | null = null;
    textarea: HTMLTextAreaElement | null = null;
    buffer = { active: { viewportY: 0 } };
    renderer = {
      getMetrics: () => ({ width: 8, height: 18 }),
    };
    #onData: ((data: string) => void) | null = null;
    #onResize: ((next: { cols: number; rows: number }) => void) | null = null;

    constructor(_: unknown) {}

    open(root: HTMLDivElement) {
      this.element = document.createElement("div");
      this.textarea = document.createElement("textarea");
      root.appendChild(this.element);
      root.appendChild(this.textarea);
    }

    onData(handler: (data: string) => void) {
      this.#onData = handler;
      return { dispose() {} };
    }

    onResize(handler: (next: { cols: number; rows: number }) => void) {
      this.#onResize = handler;
      return { dispose() {} };
    }

    write(_: string) {}
    clear() {}
    dispose() {}
    scrollToLine(line: number) {
      this.buffer.active.viewportY = line;
    }
    getViewportY() {
      return this.buffer.active.viewportY;
    }
    resize(cols: number, rows: number) {
      this.cols = cols;
      this.rows = rows;
      this.#onResize?.({ cols, rows });
    }
  }

  return {
    init: vi.fn().mockResolvedValue(undefined),
    Terminal: MockGhosttyTerminal,
  };
});

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static OPEN = 1;
  static CLOSED = 3;
  readyState = MockWebSocket.OPEN;
  url: string;
  onopen: (() => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  sent: string[] = [];
  #listeners = new Map<string, Set<(event: CloseEvent) => void>>();

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    queueMicrotask(() => {
      this.onopen?.();
    });
  }

  addEventListener(type: string, listener: (event: CloseEvent) => void) {
    const listeners = this.#listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.#listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: (event: CloseEvent) => void) {
    this.#listeners.get(type)?.delete(listener);
  }

  close(code = 1000, reason = "") {
    this.readyState = MockWebSocket.CLOSED;
    const event = { code, reason } as CloseEvent;
    this.onclose?.(event);
    this.#listeners.get("close")?.forEach((listener) => listener(event));
  }

  send(payload: string) {
    this.sent.push(payload);
  }
}

vi.stubGlobal("WebSocket", MockWebSocket as unknown as typeof WebSocket);

import { HostedSolidWidgetPlugin, RenderOrderPlugin, SceneHydratorPlugin, TransformPlugin, type IPluginContext } from "../../../src/plugins";
import {
  createCanvasTestHarness,
  createMockDocHandle,
  flushCanvasEffects,
} from "../../test-setup";

function createTerminalSafeClientMock() {
  const safeClient: TTerminalSafeClient = {
    api: {
      pty: {
        list: vi.fn().mockResolvedValue([null, []]),
        create: vi.fn().mockResolvedValue([null, {
          id: "pty-1",
          title: "Terminal",
          command: "zsh",
          args: [],
          cwd: ".",
          status: "running",
          pid: 1,
        }]),
        get: vi.fn().mockResolvedValue([null, null]),
        update: vi.fn().mockResolvedValue([null, {
          id: "pty-1",
          title: "Terminal",
          command: "zsh",
          args: [],
          cwd: ".",
          status: "running",
          pid: 1,
        }]),
        remove: vi.fn().mockResolvedValue([null, { ok: true }]),
      },
    },
  };

  return safeClient;
}

describe("HostedSolidWidget resize focus regression", () => {
  test.beforeEach(() => {
    MockWebSocket.instances = [];
    localStorage.clear();
  });

  test("restores terminal interactivity after resize transform ends", async () => {
    vi.useFakeTimers();

    try {
      let context!: IPluginContext;
      const safeClient = createTerminalSafeClientMock();
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
        appCapabilities: {
          terminal: { safeClient },
        },
        initializeScene: (ctx) => {
          context = ctx;
        },
      });

      await flushCanvasEffects();
      context.setState("focusedId", "terminal1");
      await flushCanvasEffects();

      const node = harness.staticForegroundLayer.findOne("#terminal1") as Konva.Rect;
      const transformer = harness.dynamicLayer.findOne((candidate: Konva.Node) => candidate instanceof Konva.Transformer) as Konva.Transformer;
      const mount = harness.stage.container().querySelector('[data-hosted-widget-id="terminal1"]') as HTMLDivElement | null;
      const resizeButton = harness.stage.container().querySelector('[aria-label="Show resize handles"]') as HTMLButtonElement | null;
      const textarea = harness.stage.container().querySelector('[data-ghostty-terminal-textarea="true"]') as HTMLTextAreaElement | null;

      expect(node).not.toBeNull();
      expect(transformer).not.toBeNull();
      expect(mount).not.toBeNull();
      expect(resizeButton).not.toBeNull();
      expect(textarea).not.toBeNull();
      expect(document.activeElement).toBe(textarea);

      resizeButton?.click();
      await flushCanvasEffects();

      expect(mount?.dataset.hostedWidgetInteractive).toBe("false");
      expect(mount?.hasAttribute("inert")).toBe(true);

      node.scale({ x: 1.25, y: 1.15 });
      transformer.fire("transformstart");
      transformer.fire("transformend");
      await flushCanvasEffects();

      expect(mount?.dataset.hostedWidgetInteractive).toBe("true");
      expect(mount?.style.pointerEvents).toBe("auto");
      expect(mount?.hasAttribute("inert")).toBe(false);
      expect(document.activeElement).toBe(textarea);

      harness.destroy();
    } finally {
      vi.useRealTimers();
    }
  });
});
