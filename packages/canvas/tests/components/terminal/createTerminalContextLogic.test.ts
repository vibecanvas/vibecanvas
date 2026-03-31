import { createRoot } from "solid-js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createTerminalContextLogic } from "../../../src/components/terminal/createTerminalContextLogic";
import type { TGhosttyTerminalInstance } from "../../../src/components/terminal/GhosttyTerminalMount";
import type { TTerminalSafeClient } from "../../../src/services/canvas/interface";

const storage = new Map<string, string>();

class MockResizeObserver {
  observe() {}
  disconnect() {}
}

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static OPEN = 1;

  readyState = MockWebSocket.OPEN;
  url: string;
  onopen: (() => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  #listeners = new Map<string, Set<(event: unknown) => void>>();

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    setTimeout(() => {
      this.onopen?.();
    }, 0);
  }

  addEventListener(type: string, listener: (event: unknown) => void) {
    const listeners = this.#listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.#listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: (event: unknown) => void) {
    this.#listeners.get(type)?.delete(listener);
  }

  close(code = 1000, reason = "") {
    const event = { code, reason } as CloseEvent;
    this.onclose?.(event);
    this.#listeners.get("close")?.forEach((listener) => listener(event));
  }

  send(_: string) {}
}

function setClientSize(element: HTMLElement, width: number, height: number) {
  Object.defineProperty(element, "clientWidth", { configurable: true, value: width });
  Object.defineProperty(element, "clientHeight", { configurable: true, value: height });
}

function createMockTerminal(
  onResize: (cols: number, rows: number) => void,
): TGhosttyTerminalInstance {
  const terminal: TGhosttyTerminalInstance = {
    rows: 24,
    cols: 80,
    renderer: {
      getMetrics: () => ({ width: 8, height: 18 }),
    },
    resize(cols: number, rows: number) {
      terminal.cols = cols;
      terminal.rows = rows;
      onResize(cols, rows);
    },
    getViewportY: () => 0,
    scrollToLine: vi.fn(),
    write: vi.fn(),
    clear: vi.fn(),
    dispose: vi.fn(),
    open: vi.fn(),
    onData: vi.fn(),
    onResize: vi.fn(),
  };

  return terminal;
}

function createTerminalSafeClientMock(overrides?: {
  onGet?: () => void;
  onUpdate?: (size: { rows: number; cols: number }) => void;
}) {
  const safeClient: TTerminalSafeClient = {
    api: {
      pty: {
        list: vi.fn().mockResolvedValue([null, []]),
        create: vi.fn().mockResolvedValue([null, null]),
        get: vi.fn().mockImplementation(async () => {
          overrides?.onGet?.();
          return [null, {
            id: "pty-restored",
            title: "Terminal",
            command: "zsh",
            args: [],
            cwd: ".",
            status: "running",
            pid: 1,
          }];
        }),
        update: vi.fn().mockImplementation(async ({ body }) => {
          overrides?.onUpdate?.(body.size!);
          return [null, {
            id: "pty-restored",
            title: "Terminal",
            command: "zsh",
            args: [],
            cwd: ".",
            status: "running",
            pid: 1,
          }];
        }),
        remove: vi.fn().mockResolvedValue([null, { ok: true }]),
      },
    },
  };

  return safeClient;
}

describe("createTerminalContextLogic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    storage.clear();
    MockWebSocket.instances.length = 0;

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
      },
    });

    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    vi.stubGlobal("WebSocket", MockWebSocket as unknown as typeof WebSocket);
    vi.stubGlobal("requestAnimationFrame", ((callback: FrameRequestCallback) => {
      return setTimeout(() => callback(0), 0) as unknown as number;
    }) satisfies typeof requestAnimationFrame);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    storage.clear();
    MockWebSocket.instances.length = 0;
  });

  test("restore uses measured host size and replays from cursor zero on cold reconnect", async () => {
    const events: string[] = [];
    storage.set("vibecanvas-terminal-session:terminal-1", JSON.stringify({
      terminalKey: "terminal-1",
      workingDirectory: ".",
      ptyID: "pty-restored",
      cursor: 321,
      rows: 24,
      cols: 80,
      title: "Terminal",
      scrollY: 0,
    }));

    const safeClient = createTerminalSafeClientMock({
      onGet: () => {
        events.push("pty:get");
      },
      onUpdate: ({ rows, cols }) => {
        events.push(`pty:update:${cols}x${rows}`);
      },
    });

    const host = document.createElement("div");
    const root = document.createElement("div");
    setClientSize(host, 960, 594);
    setClientSize(root, 960, 594);

    let logic!: ReturnType<typeof createTerminalContextLogic>;
    const dispose = createRoot((rootDispose) => {
      logic = createTerminalContextLogic({
        terminalKey: "terminal-1",
        workingDirectory: ".",
        title: "Terminal",
        safeClient,
      });
      return rootDispose;
    });

    const term = createMockTerminal((cols, rows) => {
      events.push(`term:resize:${cols}x${rows}`);
      logic.handleTerminalResize({ cols, rows }, term);
    });

    await logic.handleTerminalReady({ term, root, host });

    events.push(`ws:connect:${MockWebSocket.instances[0]?.url ?? "missing"}`);

    expect(events[0]).toBe("pty:get");
    expect(events[1]).toBe("term:resize:120x33");
    expect(events[2]).toBe("pty:update:120x33");
    expect(events[3]).toContain("ws:connect:ws://");
    expect(events[3]).toContain("cursor=0");
    expect(events).not.toContain("term:resize:80x24");
    expect(events).not.toContain("pty:update:80x24");

    await vi.runAllTimersAsync();

    expect(events).toEqual([
      "pty:get",
      "term:resize:120x33",
      "pty:update:120x33",
      expect.stringContaining("ws:connect:ws://"),
    ]);
    expect(vi.mocked(safeClient.api.pty.create)).not.toHaveBeenCalled();

    dispose();
  });

  test("ignores zero-sized stale mount and avoids stale 20x8 backend sync", async () => {
    const events: string[] = [];
    storage.set("vibecanvas-terminal-session:terminal-1", JSON.stringify({
      terminalKey: "terminal-1",
      workingDirectory: ".",
      ptyID: "pty-restored",
      cursor: 321,
      rows: 24,
      cols: 80,
      title: "Terminal",
      scrollY: 0,
    }));

    const safeClient = createTerminalSafeClientMock({
      onGet: () => {
        events.push("pty:get");
      },
      onUpdate: ({ rows, cols }) => {
        events.push(`pty:update:${cols}x${rows}`);
      },
    });

    let logic!: ReturnType<typeof createTerminalContextLogic>;
    const dispose = createRoot((rootDispose) => {
      logic = createTerminalContextLogic({
        terminalKey: "terminal-1",
        workingDirectory: ".",
        title: "Terminal",
        safeClient,
      });
      return rootDispose;
    });

    const zeroHost = document.createElement("div");
    const zeroRoot = document.createElement("div");
    setClientSize(zeroHost, 0, 0);
    setClientSize(zeroRoot, 0, 0);

    const realHost = document.createElement("div");
    const realRoot = document.createElement("div");
    setClientSize(realHost, 960, 594);
    setClientSize(realRoot, 960, 594);

    const zeroTerm = createMockTerminal((cols, rows) => {
      events.push(`zero:resize:${cols}x${rows}`);
      logic.handleTerminalResize({ cols, rows }, zeroTerm);
    });

    const realTerm = createMockTerminal((cols, rows) => {
      events.push(`real:resize:${cols}x${rows}`);
      logic.handleTerminalResize({ cols, rows }, realTerm);
    });

    const zeroReady = logic.handleTerminalReady({ term: zeroTerm, root: zeroRoot, host: zeroHost });
    const realReady = logic.handleTerminalReady({ term: realTerm, root: realRoot, host: realHost });

    await zeroReady;
    await realReady;
    await vi.runAllTimersAsync();

    expect(events).toContain("pty:get");
    expect(events).toContain("real:resize:120x33");
    expect(events).toContain("pty:update:120x33");
    expect(events).not.toContain("zero:resize:20x8");
    expect(events).not.toContain("pty:update:20x8");
    expect(MockWebSocket.instances).toHaveLength(1);

    dispose();
  });

  test("latest logic instance wins when two terminal logic instances share one terminalKey", async () => {
    const events: string[] = [];
    storage.set("vibecanvas-terminal-session:terminal-1", JSON.stringify({
      terminalKey: "terminal-1",
      workingDirectory: ".",
      ptyID: "pty-restored",
      cursor: 321,
      rows: 24,
      cols: 80,
      title: "Terminal",
      scrollY: 0,
    }));

    const safeClient = createTerminalSafeClientMock({
      onGet: () => {
        events.push("pty:get");
      },
      onUpdate: ({ rows, cols }) => {
        events.push(`pty:update:${cols}x${rows}`);
      },
    });

    let logicA!: ReturnType<typeof createTerminalContextLogic>;
    const disposeA = createRoot((rootDispose) => {
      logicA = createTerminalContextLogic({
        terminalKey: "terminal-1",
        workingDirectory: ".",
        title: "Terminal",
        safeClient,
      });
      return rootDispose;
    });

    let logicB!: ReturnType<typeof createTerminalContextLogic>;
    const disposeB = createRoot((rootDispose) => {
      logicB = createTerminalContextLogic({
        terminalKey: "terminal-1",
        workingDirectory: ".",
        title: "Terminal",
        safeClient,
      });
      return rootDispose;
    });

    const zeroHost = document.createElement("div");
    const zeroRoot = document.createElement("div");
    setClientSize(zeroHost, 0, 0);
    setClientSize(zeroRoot, 0, 0);

    const realHost = document.createElement("div");
    const realRoot = document.createElement("div");
    setClientSize(realHost, 960, 594);
    setClientSize(realRoot, 960, 594);

    const termA = createMockTerminal((cols, rows) => {
      events.push(`logicA:resize:${cols}x${rows}`);
      logicA.handleTerminalResize({ cols, rows }, termA);
    });

    const termB = createMockTerminal((cols, rows) => {
      events.push(`logicB:resize:${cols}x${rows}`);
      logicB.handleTerminalResize({ cols, rows }, termB);
    });

    const readyA = logicA.handleTerminalReady({ term: termA, root: zeroRoot, host: zeroHost });
    const readyB = logicB.handleTerminalReady({ term: termB, root: realRoot, host: realHost });

    await readyA;
    await readyB;
    await vi.runAllTimersAsync();

    expect(events).toContain("logicB:resize:120x33");
    expect(events).toContain("pty:update:120x33");
    expect(events).not.toContain("logicA:resize:20x8");
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0]?.url).toContain("cursor=0");

    disposeA();
    disposeB();
  });
});
