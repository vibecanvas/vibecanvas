import Konva from "konva";
import { describe, expect, test, vi } from "vitest";
import type { TFiletreeSafeClient, TTerminalSafeClient } from "../../../src/services/canvas/interface";

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
  #listeners = new Map<string, Set<(event: any) => void>>();

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    queueMicrotask(() => {
      this.onopen?.();
    });
  }

  addEventListener(type: string, listener: (event: any) => void) {
    const listeners = this.#listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.#listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: (event: any) => void) {
    this.#listeners.get(type)?.delete(listener);
  }

  close(code = 1000, reason = "") {
    this.readyState = MockWebSocket.CLOSED;
    const event = { code, reason } as CloseEvent;
    this.onclose?.(event);
    this.#listeners.get("close")?.forEach((listener) => listener(event));
  }

  send(_: string) {}
}

vi.stubGlobal("WebSocket", MockWebSocket as unknown as typeof WebSocket);

import type { IPluginContext } from "../../../src/plugins/interface";
import { CustomEvents } from "../../../src/custom-events";
import { HostedSolidWidgetPlugin } from "../../../src/plugins/HostedSolidWidget.plugin";
import { RenderOrderPlugin } from "../../../src/plugins/RenderOrder.plugin";
import { SceneHydratorPlugin } from "../../../src/plugins/SceneHydrator.plugin";
import { TransformPlugin } from "../../../src/plugins/Transform.plugin";
import { CanvasMode } from "../../../src/services/canvas/enum";
import {
  createCanvasTestHarness,
  createStagePointerEvent,
  createMockDocHandle,
  flushCanvasEffects,
} from "../../test-setup";

function createTerminalSafeClientMock() {
  const safeClient: TTerminalSafeClient = {
    api: {
      opencode: {
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
    },
  };

  return safeClient;
}

function createFiletreeSafeClientMock(overrides?: {
  fileTrees?: Array<{
    id: string;
    canvas_id: string;
    path: string;
    title: string;
    locked: boolean;
    glob_pattern: string | null;
    created_at: Date;
    updated_at: Date;
  }>;
  createdFiletree?: {
    id: string;
    canvas_id: string;
    path: string;
    title: string;
    locked: boolean;
    glob_pattern: string | null;
    created_at: Date;
    updated_at: Date;
  };
}) {
  const createdFiletree = overrides?.createdFiletree ?? {
    id: "tree-created",
    canvas_id: "canvas-1",
    path: "/tmp/demo",
    title: "File Tree",
    locked: false,
    glob_pattern: null,
    created_at: new Date(1),
    updated_at: new Date(1),
  };
  const fileTrees = overrides?.fileTrees ?? [createdFiletree];

  const safeClient: TFiletreeSafeClient = {
    api: {
      canvas: {
        get: vi.fn().mockResolvedValue([null, {
          chats: [],
          canvas: [],
          fileTrees,
        }]),
      },
      filetree: {
        create: vi.fn().mockResolvedValue([null, createdFiletree]),
        update: vi.fn().mockImplementation(async ({ params, body }) => {
          const existing = fileTrees.find((candidate) => candidate.id === params.id) ?? createdFiletree;
          const next = {
            ...existing,
            ...("title" in body ? { title: body.title ?? existing.title } : {}),
            ...("path" in body ? { path: body.path ?? existing.path } : {}),
            ...("locked" in body ? { locked: body.locked ?? existing.locked } : {}),
            ...("glob_pattern" in body ? { glob_pattern: body.glob_pattern ?? null } : {}),
          };
          return [null, next];
        }),
        remove: vi.fn().mockResolvedValue([null, undefined]),
      },
      filesystem: {
        home: vi.fn().mockResolvedValue([null, { path: "/tmp/demo" }]),
        list: vi.fn().mockResolvedValue([null, {
          current: "/tmp/demo",
          parent: "/tmp",
          children: [
            { name: "src", path: "/tmp/demo/src", isDir: true },
          ],
        }]),
        files: vi.fn().mockResolvedValue([null, {
          root: "/tmp/demo",
          children: [
            {
              name: "src",
              path: "/tmp/demo/src",
              is_dir: true,
              children: [
                { name: "index.ts", path: "/tmp/demo/src/index.ts", is_dir: false, children: [] },
              ],
            },
          ],
        }]),
        move: vi.fn().mockResolvedValue([null, {
          source_path: "/tmp/demo/src/index.ts",
          destination_dir_path: "/tmp/demo/src",
          target_path: "/tmp/demo/src/index.ts",
          moved: true,
        }]),
        inspect: vi.fn().mockResolvedValue([null, {
          name: "index.ts",
          path: "/tmp/demo/src/index.ts",
          mime: "text/plain",
          kind: "text",
          size: 12,
          lastModified: 1,
          permissions: "rw-r--r--",
        }]),
        read: vi.fn().mockResolvedValue([null, {
          kind: "text",
          content: "console.log('hello')\n",
          truncated: false,
        }]),
        write: vi.fn().mockResolvedValue([null, { success: true }]),
        watch: vi.fn().mockResolvedValue([null, (async function* () {})()]),
        keepaliveWatch: vi.fn().mockResolvedValue([null, true]),
        unwatch: vi.fn().mockResolvedValue([null, { ok: true }]),
      },
    },
  };

  return safeClient;
}

describe("HostedSolidWidgetPlugin", () => {
  test.beforeEach(() => {
    MockWebSocket.instances = [];
    localStorage.clear();
  });

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

  test("terminal overlay visible shell stays anchored to the persisted x position across reloads with different zoom/camera states", async () => {
    async function measureVisibleWidgetLeft(args: { zoom: number; panX: number; panY: number; type: "terminal" | "filetree" }) {
      let context!: IPluginContext;
      const docHandle = createMockDocHandle({
        elements: {
          widget1: {
            id: "widget1",
            x: 160,
            y: 120,
            rotation: 0,
            zIndex: "z00000001",
            parentGroupId: null,
            bindings: [],
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {},
            data: args.type === "terminal"
              ? { type: "terminal", w: 320, h: 220, isCollapsed: false, workingDirectory: "." }
              : { type: "filetree", w: 320, h: 220, isCollapsed: false, globPattern: null },
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

      if (args.panX !== 0 || args.panY !== 0) {
        context.camera.pan(-args.panX, -args.panY);
      }
      if (args.zoom !== 1) {
        context.camera.zoomAtScreenPoint(args.zoom, { x: 240, y: 180 });
      }
      context.hooks.cameraChange.call();
      await flushCanvasEffects();

      const node = harness.staticForegroundLayer.findOne("#widget1") as Konva.Rect;
      const mount = harness.stage.container().querySelector("[data-hosted-widget-id='widget1']") as HTMLDivElement;
      const shell = mount.querySelector("[data-hosted-widget-root='true']") as HTMLDivElement;
      const transformMatch = mount.style.transform.match(/translate\(([-\d.]+)px, ([-\d.]+)px\) rotate\(([-\d.]+)deg\) scale\(([-\d.]+)\)/);
      if (!transformMatch) {
        throw new Error(`Unexpected hosted widget transform: ${mount.style.transform}`);
      }

      const projectedLeft = Number(transformMatch[1]) + Number.parseFloat(shell.style.inset || "0") * Number(transformMatch[4]);
      const expectedLeft = node.getAbsoluteTransform().point({ x: 0, y: 0 }).x;

      harness.destroy();

      return { projectedLeft, expectedLeft };
    }

    const baseline = await measureVisibleWidgetLeft({ type: "terminal", zoom: 1, panX: 0, panY: 0 });
    const reloadedAtDifferentCamera = await measureVisibleWidgetLeft({ type: "terminal", zoom: 1.75, panX: 130, panY: 40 });
    const filetreeBaseline = await measureVisibleWidgetLeft({ type: "filetree", zoom: 1, panX: 0, panY: 0 });
    const filetreeReloaded = await measureVisibleWidgetLeft({ type: "filetree", zoom: 1.75, panX: 130, panY: 40 });

    expect(baseline.projectedLeft).toBeCloseTo(baseline.expectedLeft, 3);
    expect(reloadedAtDifferentCamera.projectedLeft).toBeCloseTo(reloadedAtDifferentCamera.expectedLeft, 3);
    expect(filetreeBaseline.projectedLeft).toBeCloseTo(filetreeBaseline.expectedLeft, 3);
    expect(filetreeReloaded.projectedLeft).toBeCloseTo(filetreeReloaded.expectedLeft, 3);
  });

  test("close button removes hosted terminal and runs terminal cleanup callback", async () => {
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
      plugins: [new RenderOrderPlugin(), new HostedSolidWidgetPlugin(), new SceneHydratorPlugin()],
      appCapabilities: {
        terminal: { safeClient },
      },
    });

    await flushCanvasEffects();

    const closeButton = harness.stage.container().querySelector('[aria-label="Close widget"]') as HTMLButtonElement;
    closeButton.click();
    await flushCanvasEffects();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await flushCanvasEffects();

    expect(safeClient.api.opencode.pty.create).toHaveBeenCalled();
    expect(safeClient.api.opencode.pty.remove).toHaveBeenCalledTimes(1);
    expect(docHandle.doc().elements.terminal1).toBeUndefined();
    expect(harness.stage.container().querySelector('[data-hosted-widget-id="terminal1"]')).toBeNull();

    harness.destroy();
  });

  test("reloading hosted terminal restarts frontend and reconnects to existing PTY session", async () => {
    const safeClient = createTerminalSafeClientMock();
    safeClient.api.opencode.pty.get = vi.fn().mockResolvedValue([null, {
      id: "pty-reload",
      title: "Terminal",
      command: "zsh",
      args: [],
      cwd: ".",
      status: "running",
      pid: 1,
    }]);
    localStorage.setItem("vibecanvas-terminal-session:terminal1", JSON.stringify({
      terminalKey: "terminal1",
      workingDirectory: ".",
      ptyID: "pty-reload",
      cursor: 22,
      rows: 24,
      cols: 80,
      title: "Terminal",
      scrollY: 0,
    }));
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
        terminal: { safeClient },
      },
    });

    await flushCanvasEffects();
    const initialConnectionCount = MockWebSocket.instances.length;
    const initialGetCount = vi.mocked(safeClient.api.opencode.pty.get).mock.calls.length;
    expect(initialConnectionCount).toBeGreaterThan(0);

    const reloadButton = harness.stage.container().querySelector('[aria-label="Reload widget"]') as HTMLButtonElement;
    reloadButton.click();
    await flushCanvasEffects();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await flushCanvasEffects();

    expect(MockWebSocket.instances.length).toBeGreaterThan(initialConnectionCount);
    expect(vi.mocked(safeClient.api.opencode.pty.get).mock.calls.length).toBeGreaterThan(initialGetCount);
    expect(safeClient.api.opencode.pty.create).not.toHaveBeenCalled();

    harness.destroy();
  });

  test("restored terminal session reconnects using the saved cursor instead of restarting from zero", async () => {
    const safeClient = createTerminalSafeClientMock();
    safeClient.api.opencode.pty.get = vi.fn().mockResolvedValue([null, {
      id: "pty-restored",
      title: "Terminal",
      command: "zsh",
      args: [],
      cwd: ".",
      status: "running",
      pid: 1,
    }]);

    localStorage.setItem("vibecanvas-terminal-session:terminal1", JSON.stringify({
      terminalKey: "terminal1",
      workingDirectory: ".",
      ptyID: "pty-restored",
      cursor: 321,
      rows: 24,
      cols: 80,
      title: "Terminal",
      scrollY: 0,
    }));

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
        terminal: { safeClient },
      },
    });

    await flushCanvasEffects();

    expect(safeClient.api.opencode.pty.get).toHaveBeenCalledWith({
      workingDirectory: ".",
      path: { ptyID: "pty-restored" },
    });
    expect(MockWebSocket.instances[0]?.url).toContain("cursor=321");
    expect(safeClient.api.opencode.pty.create).not.toHaveBeenCalled();

    harness.destroy();
  });

  test("creates hosted filetree through backend create route", async () => {
    let context!: IPluginContext;
    const filetreeClient = createFiletreeSafeClientMock();
    const docHandle = createMockDocHandle();
    localStorage.removeItem("vibecanvas-filetree-last-path");

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new HostedSolidWidgetPlugin()],
      appCapabilities: {
        filetree: {
          canvasId: "canvas-1",
          safeClient: filetreeClient,
        },
      },
      initializeScene: (ctx) => {
        context = ctx;
      },
    });

    await flushCanvasEffects();

    context.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "filesystem");
    context.setState("mode", CanvasMode.CLICK_CREATE);
    const evt = createStagePointerEvent(harness.stage, { x: 180, y: 140, type: "pointerup" });
    harness.stage.setPointersPositions(evt);
    context.hooks.pointerUp.call({} as any);
    await flushCanvasEffects();

    expect(filetreeClient.api.filetree.create).toHaveBeenCalledWith({
      canvas_id: "canvas-1",
      x: 180,
      y: 140,
    });
    expect(docHandle.doc().elements["tree-created"]).toBeDefined();
    expect(harness.staticForegroundLayer.findOne("#tree-created")).toBeInstanceOf(Konva.Rect);
    expect(harness.stage.container().querySelector('[data-hosted-widget-id="tree-created"]')).not.toBeNull();

    harness.destroy();
  });

  test("close button removes hosted filetree and runs backend cleanup callback", async () => {
    const filetreeClient = createFiletreeSafeClientMock({
      fileTrees: [{
        id: "tree1",
        canvas_id: "canvas-1",
        path: "/tmp/demo",
        title: "File Tree",
        locked: false,
        glob_pattern: null,
        created_at: new Date(1),
        updated_at: new Date(1),
      }],
    });
    const docHandle = createMockDocHandle({
      elements: {
        tree1: {
          id: "tree1",
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
          data: { type: "filetree", w: 360, h: 460, isCollapsed: false, globPattern: null },
        },
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new HostedSolidWidgetPlugin(), new SceneHydratorPlugin()],
      appCapabilities: {
        filetree: {
          canvasId: "canvas-1",
          safeClient: filetreeClient,
        },
      },
    });

    await flushCanvasEffects();

    const closeButton = harness.stage.container().querySelector('[aria-label="Close widget"]') as HTMLButtonElement;
    closeButton.click();
    await flushCanvasEffects();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await flushCanvasEffects();

    expect(filetreeClient.api.filetree.remove).toHaveBeenCalledWith({ params: { id: "tree1" } });
    expect(docHandle.doc().elements.tree1).toBeUndefined();
    expect(harness.stage.container().querySelector('[data-hosted-widget-id="tree1"]')).toBeNull();

    harness.destroy();
  });

  test("lets the filetree widget drive the hosted shell title", async () => {
    const filetreeClient = createFiletreeSafeClientMock({
      fileTrees: [{
        id: "tree1",
        canvas_id: "canvas-1",
        path: "/tmp/demo",
        title: "Workspace",
        locked: false,
        glob_pattern: null,
        created_at: new Date(1),
        updated_at: new Date(1),
      }],
    });
    const docHandle = createMockDocHandle({
      elements: {
        tree1: {
          id: "tree1",
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
          data: { type: "filetree", w: 360, h: 460, isCollapsed: false, globPattern: null },
        },
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new HostedSolidWidgetPlugin(), new SceneHydratorPlugin()],
      appCapabilities: {
        filetree: {
          canvasId: "canvas-1",
          safeClient: filetreeClient,
        },
      },
    });

    await flushCanvasEffects();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await flushCanvasEffects();

    const title = harness.stage.container().querySelector('[data-hosted-widget-title="true"]') as HTMLDivElement | null;
    expect(title?.textContent).toBe("~");
    expect(harness.stage.container().textContent).not.toContain("filesystem");

    harness.destroy();
  });

  test("hydrates hosted file elements into file widgets", async () => {
    const safeClient = createFiletreeSafeClientMock();
    const docHandle = createMockDocHandle({
      elements: {
        file1: {
          id: "file1",
          x: 80,
          y: 120,
          rotation: 0,
          zIndex: "z00000001",
          parentGroupId: null,
          bindings: [],
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {},
          data: { type: "file", w: 560, h: 500, path: "/tmp/demo/src/index.ts", renderer: "code", isCollapsed: false },
        },
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new HostedSolidWidgetPlugin(), new SceneHydratorPlugin()],
      appCapabilities: {
        file: { safeClient },
      },
    });

    await flushCanvasEffects();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await flushCanvasEffects();

    expect(harness.staticForegroundLayer.findOne("#file1")).toBeInstanceOf(Konva.Rect);
    expect(harness.stage.container().querySelector('[data-hosted-widget-id="file1"]')).not.toBeNull();
    expect(harness.stage.container().querySelector('[data-file-widget-root="true"]')).not.toBeNull();
    expect((harness.stage.container().querySelector('[data-hosted-widget-title="true"]') as HTMLDivElement | null)?.textContent).toBe("index.ts");
    expect((harness.stage.container().querySelector('[data-hosted-widget-subtitle="true"]') as HTMLDivElement | null)?.textContent).toContain("code");

    harness.destroy();
  });

  test("image file widget auto-sizes once after first image render", async () => {
    const safeClient = createFiletreeSafeClientMock();
    safeClient.api.filesystem.read = vi.fn().mockResolvedValue([null, {
      kind: "binary",
      content: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4XcAAAAASUVORK5CYII=",
      size: 68,
      mime: "image/png",
      encoding: "base64",
    }]);

    const docHandle = createMockDocHandle({
      elements: {
        file1: {
          id: "file1",
          x: 80,
          y: 120,
          rotation: 0,
          zIndex: "z00000001",
          parentGroupId: null,
          bindings: [],
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {},
          data: { type: "file", w: 560, h: 500, path: "/tmp/demo/image.png", renderer: "image", isCollapsed: false },
        },
      },
    });

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new HostedSolidWidgetPlugin(), new SceneHydratorPlugin()],
      appCapabilities: {
        file: { safeClient },
      },
    });

    await flushCanvasEffects();

    const image = harness.stage.container().querySelector("img") as HTMLImageElement;
    Object.defineProperty(image, "naturalWidth", { value: 320, configurable: true });
    Object.defineProperty(image, "naturalHeight", { value: 180, configurable: true });
    image.dispatchEvent(new Event("load"));
    await flushCanvasEffects();

    const node = harness.staticForegroundLayer.findOne("#file1") as Konva.Rect;
    expect(node.width()).toBe(344);
    expect(node.height()).toBe(236);

    harness.destroy();
  });

  test("dropping a filetree file node on canvas creates a hosted file widget", async () => {
    const safeClient = createFiletreeSafeClientMock();
    const docHandle = createMockDocHandle();

    const harness = await createCanvasTestHarness({
      docHandle,
      plugins: [new RenderOrderPlugin(), new HostedSolidWidgetPlugin()],
      appCapabilities: {
        filetree: {
          canvasId: "canvas-1",
          safeClient,
        },
        file: { safeClient },
      },
    });

    await flushCanvasEffects();

    const dropEvent = new Event("drop", { bubbles: true, cancelable: true }) as DragEvent;
    Object.defineProperties(dropEvent, {
      clientX: { value: 200 },
      clientY: { value: 160 },
      dataTransfer: {
        value: {
          types: ["application/x-vibecanvas-filetree-node"],
          getData: (type: string) => type === "application/x-vibecanvas-filetree-node"
            ? JSON.stringify({ path: "/tmp/demo/src/index.ts", name: "index.ts", is_dir: false })
            : "",
        },
      },
    });

    harness.stage.container().dispatchEvent(dropEvent);
    await flushCanvasEffects();

    const elements = Object.values(docHandle.doc().elements);
    expect(elements.some((element) => element.data.type === "file" && "path" in element.data && element.data.path === "/tmp/demo/src/index.ts")).toBe(true);
    expect(harness.stage.container().querySelector('[data-file-widget-root="true"]')).not.toBeNull();

    harness.destroy();
  });

  test("terminal hosted layout constrains flex children so terminal content can shrink to widget bounds", async () => {
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
      plugins: [new RenderOrderPlugin(), new HostedSolidWidgetPlugin(), new SceneHydratorPlugin()],
      appCapabilities: {
        terminal: { safeClient },
      },
    });

    await flushCanvasEffects();

    const hostedWrapper = harness.stage.container().querySelector('[data-terminal-hosted-wrapper="true"]') as HTMLDivElement;
    const widgetRoot = harness.stage.container().querySelector('[data-terminal-widget-root="true"]') as HTMLDivElement;
    const ghosttyHost = harness.stage.container().querySelector('[data-ghostty-terminal-host="true"]') as HTMLDivElement;
    const ghosttyRoot = harness.stage.container().querySelector('[data-ghostty-terminal-root="true"]') as HTMLDivElement;

    expect(hostedWrapper.className).toContain("min-w-0");
    expect(widgetRoot.style.minWidth).toBe("0");
    expect(widgetRoot.style.minHeight).toBe("0");
    expect(ghosttyHost.style.minWidth).toBe("0");
    expect(ghosttyHost.style.minHeight).toBe("0");
    expect(ghosttyRoot.style.minWidth).toBe("0");
    expect(ghosttyRoot.style.minHeight).toBe("0");

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

  test("hosted widget drag matches pointer world-space movement across zoom levels", async () => {
    let context!: IPluginContext;

    async function runDragAtZoom(zoom: number) {
      const docHandle = createMockDocHandle({
        elements: {
          terminal1: {
            id: "terminal1",
            x: 100,
            y: 120,
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
      context.camera.zoomAtScreenPoint(zoom, { x: 0, y: 0 });
      context.hooks.cameraChange.call();
      await flushCanvasEffects();

      const header = harness.stage.container().querySelector("[data-hosted-widget-header='true']") as HTMLDivElement;
      const initial = structuredClone(docHandle.doc().elements.terminal1!);
      const headerRect = header.getBoundingClientRect();
      const startPointer = {
        x: Math.round(headerRect.left + Math.min(24, headerRect.width / 2)),
        y: Math.round(headerRect.top + Math.min(16, headerRect.height / 2)),
      };
      const endPointer = { x: startPointer.x + 60, y: startPointer.y + 40 };
      const expectedDelta = {
        x: (endPointer.x - startPointer.x) / zoom,
        y: (endPointer.y - startPointer.y) / zoom,
      };

      header.dispatchEvent(new MouseEvent("pointerdown", {
        bubbles: true,
        button: 0,
        clientX: startPointer.x,
        clientY: startPointer.y,
      }));
      window.dispatchEvent(new MouseEvent("pointermove", {
        bubbles: true,
        clientX: endPointer.x,
        clientY: endPointer.y,
      }));
      window.dispatchEvent(new MouseEvent("pointerup", {
        bubbles: true,
        clientX: endPointer.x,
        clientY: endPointer.y,
      }));

      await flushCanvasEffects();

      const updated = structuredClone(docHandle.doc().elements.terminal1!);
      harness.destroy();

      return {
        actualDx: Math.round((updated.x - initial.x) * 1000) / 1000,
        actualDy: Math.round((updated.y - initial.y) * 1000) / 1000,
        expectedDx: Math.round(expectedDelta.x * 1000) / 1000,
        expectedDy: Math.round(expectedDelta.y * 1000) / 1000,
      };
    }

    const zoomedIn = await runDragAtZoom(2);
    const zoomedOut = await runDragAtZoom(0.5);

    expect(zoomedIn.actualDx).toBe(zoomedIn.expectedDx);
    expect(zoomedIn.actualDy).toBe(zoomedIn.expectedDy);
    expect(zoomedOut.actualDx).toBe(zoomedOut.expectedDx);
    expect(zoomedOut.actualDy).toBe(zoomedOut.expectedDy);
  });

  test("streams throttled CRDT updates during hosted drag before drag end", async () => {
    vi.useFakeTimers();

    try {
      const docHandle = createMockDocHandle({
        elements: {
          terminal1: {
            id: "terminal1",
            x: 100,
            y: 120,
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

      const header = harness.stage.container().querySelector("[data-hosted-widget-header='true']") as HTMLDivElement;
      const headerRect = header.getBoundingClientRect();
      const startPointer = {
        x: Math.round(headerRect.left + Math.min(24, headerRect.width / 2)),
        y: Math.round(headerRect.top + Math.min(16, headerRect.height / 2)),
      };

      header.dispatchEvent(new MouseEvent("pointerdown", {
        bubbles: true,
        button: 0,
        clientX: startPointer.x,
        clientY: startPointer.y,
      }));
      window.dispatchEvent(new MouseEvent("pointermove", {
        bubbles: true,
        clientX: startPointer.x + 80,
        clientY: startPointer.y + 60,
      }));

      expect(docHandle.doc().elements.terminal1?.x).toBe(100);
      expect(docHandle.doc().elements.terminal1?.y).toBe(120);

      await vi.advanceTimersByTimeAsync(120);

      expect(docHandle.doc().elements.terminal1?.x).not.toBe(100);
      expect(docHandle.doc().elements.terminal1?.y).not.toBe(120);

      window.dispatchEvent(new MouseEvent("pointerup", {
        bubbles: true,
        clientX: startPointer.x + 80,
        clientY: startPointer.y + 60,
      }));
      await flushCanvasEffects();

      harness.destroy();
    } finally {
      vi.useRealTimers();
    }
  });
});
