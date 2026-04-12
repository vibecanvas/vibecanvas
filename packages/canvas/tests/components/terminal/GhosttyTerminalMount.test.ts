import { afterEach, describe, expect, test, vi } from "vitest";
import { render } from "solid-js/web";

type TMockGhosttyTerminal = {
  cols: number;
  rows: number;
  element: HTMLDivElement | null;
  textarea: HTMLTextAreaElement | null;
  paste: ReturnType<typeof vi.fn>;
  input: ReturnType<typeof vi.fn>;
  attachCustomWheelEventHandler: ReturnType<typeof vi.fn>;
  customWheelEventHandler?: ((event: WheelEvent) => boolean) | undefined;
  constructorArgs: unknown;
  wasmTerm: {
    isAlternateScreen: ReturnType<typeof vi.fn>;
    hasMouseTracking: ReturnType<typeof vi.fn>;
    getMode: ReturnType<typeof vi.fn>;
    getDimensions: ReturnType<typeof vi.fn>;
  };
};

const ghosttyInstances: TMockGhosttyTerminal[] = [];

vi.mock("ghostty-web", () => {
  class MockGhosttyTerminal {
    rows = 24;
    cols = 80;
    element: HTMLDivElement | null = null;
    textarea: HTMLTextAreaElement | null = null;
    paste = vi.fn();
    input = vi.fn();
    constructorArgs: unknown = null;
    customWheelEventHandler: ((event: WheelEvent) => boolean) | undefined;
    attachCustomWheelEventHandler = vi.fn((handler?: (event: WheelEvent) => boolean) => {
      this.customWheelEventHandler = handler;
    });
    wasmTerm = {
      isAlternateScreen: vi.fn(() => false),
      hasMouseTracking: vi.fn(() => false),
      getMode: vi.fn(() => false),
      getDimensions: vi.fn(() => ({ cols: this.cols, rows: this.rows })),
    };
    #onData: ((data: string) => void) | null = null;
    #onResize: ((next: { cols: number; rows: number }) => void) | null = null;

    constructor(args: unknown) {
      this.constructorArgs = args;
      ghosttyInstances.push(this);
    }

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
  }

  return {
    init: vi.fn().mockResolvedValue(undefined),
    Terminal: MockGhosttyTerminal,
  };
});

import { GhosttyTerminalMount } from "../../../src/components/terminal/GhosttyTerminalMount";

type TClipboardEventInit = {
  text?: string;
  types?: string[];
  items?: Array<{ kind?: string; type?: string; getAsFile?: () => File | null }>;
  files?: File[];
};

async function flushTerminalMount() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
}

async function mountTerminal(args?: { onData?: (data: string) => void; onUploadClipboardImage?: (file: File | Blob) => Promise<string> }) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const onData = args?.onData ?? vi.fn();
  const onReady = vi.fn();
  const dispose = render(() => GhosttyTerminalMount({ onReady, onData, onUploadClipboardImage: args?.onUploadClipboardImage }), container);
  await flushTerminalMount();

  const host = container.querySelector("[data-ghostty-terminal-host='true']") as HTMLDivElement | null;
  const root = container.querySelector("[data-ghostty-terminal-root='true']") as HTMLDivElement | null;
  const textarea = container.querySelector("textarea") as HTMLTextAreaElement | null;
  const term = ghosttyInstances.at(-1) ?? null;

  if (!host || !root || !textarea || !term) {
    throw new Error("Failed to mount mock Ghostty terminal");
  }

  return { container, dispose, host, root, textarea, term, onData, onReady };
}

function dispatchPaste(target: EventTarget, init?: TClipboardEventInit) {
  const event = new Event("paste", { bubbles: true, cancelable: true }) as ClipboardEvent;
  Object.defineProperty(event, "clipboardData", {
    configurable: true,
    value: init
      ? {
        getData: (type: string) => {
          if (type === "text/plain" || type === "text") {
            return init.text ?? "";
          }
          return "";
        },
        types: init.types ?? [],
        items: init.items ?? [],
        files: init.files ?? [],
      }
      : null,
  });
  target.dispatchEvent(event);
  return event;
}

function setRect(target: Element, rect: { left: number; top: number; width: number; height: number }) {
  Object.defineProperty(target, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      ...rect,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      x: rect.left,
      y: rect.top,
      toJSON() {
        return this;
      },
    }),
  });
}

afterEach(() => {
  ghosttyInstances.length = 0;
  document.body.innerHTML = "";
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: undefined,
  });
  vi.restoreAllMocks();
});

describe("GhosttyTerminalMount", () => {
  test("reads Ghostty colors from shared terminal CSS vars", async () => {
    document.documentElement.style.setProperty("--vc-terminal-background", "#101820");
    document.documentElement.style.setProperty("--vc-terminal-foreground", "#f3f4f6");
    document.documentElement.style.setProperty("--vc-terminal-cursor", "#22c55e");
    document.documentElement.style.setProperty("--vc-terminal-selection-background", "#334155");

    const mounted = await mountTerminal();
    const constructorArgs = mounted.term.constructorArgs as {
      theme: {
        background: string;
        foreground: string;
        cursor: string;
        selectionBackground: string;
      };
    };

    expect(constructorArgs.theme).toEqual({
      background: "#101820",
      foreground: "#f3f4f6",
      cursor: "#22c55e",
      selectionBackground: "#334155",
    });

    mounted.dispose();
  });

  test("uploads direct image paste and inserts shell-escaped path", async () => {
    const onUploadClipboardImage = vi.fn().mockResolvedValue("/tmp/demo/it's here.png");
    const mounted = await mountTerminal({ onUploadClipboardImage });

    const file = new File([new Uint8Array([1, 2, 3])], "image.png", { type: "image/png" });
    const event = dispatchPaste(mounted.textarea, {
      types: ["Files", "image/png"],
      items: [{ kind: "file", type: "image/png", getAsFile: () => file }],
      files: [file],
    });

    await flushTerminalMount();

    expect(event.defaultPrevented).toBe(true);
    expect(onUploadClipboardImage).toHaveBeenCalledWith(file);
    expect(mounted.term.paste).toHaveBeenCalledWith("'/tmp/demo/it'\\''s here.png' ");
    expect(mounted.term.input).not.toHaveBeenCalled();

    mounted.dispose();
  });

  test("uses clipboard fallback to upload image and insert shell-escaped path", async () => {
    const onUploadClipboardImage = vi.fn().mockResolvedValue("/tmp/demo/folder with spaces/image.png");
    const mounted = await mountTerminal({ onUploadClipboardImage });

    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        readText: vi.fn().mockResolvedValue(""),
        read: vi.fn().mockResolvedValue([{ types: ["image/png"], getType: vi.fn().mockResolvedValue(blob) }]),
      },
    });

    const event = dispatchPaste(mounted.textarea, {
      types: [],
      items: [],
      files: [],
    });

    await flushTerminalMount();

    expect(event.defaultPrevented).toBe(false);
    expect(onUploadClipboardImage).toHaveBeenCalledWith(blob);
    expect(mounted.term.paste).toHaveBeenCalledWith("'/tmp/demo/folder with spaces/image.png' ");
    expect(mounted.term.input).not.toHaveBeenCalled();

    mounted.dispose();
  });

  test("falls back to ctrl-v for unsupported non-text paste", async () => {
    const mounted = await mountTerminal();

    const file = new File([new Uint8Array([1, 2, 3])], "doc.pdf", { type: "application/pdf" });
    const event = dispatchPaste(mounted.textarea, {
      types: ["Files", "application/pdf"],
      items: [{ kind: "file", type: "application/pdf", getAsFile: () => file }],
      files: [file],
    });

    expect(event.defaultPrevented).toBe(true);
    expect(mounted.term.input).toHaveBeenCalledWith("\x16", true);
    expect(mounted.term.paste).not.toHaveBeenCalled();

    mounted.dispose();
  });

  test("routes plain text paste through terminal paste", async () => {
    const mounted = await mountTerminal();

    const event = dispatchPaste(mounted.textarea, {
      text: "hello from clipboard",
      types: ["text/plain"],
      items: [{ kind: "string", type: "text/plain" }],
    });

    expect(event.defaultPrevented).toBe(true);
    expect(mounted.term.paste).toHaveBeenCalledWith("hello from clipboard");
    expect(mounted.term.input).not.toHaveBeenCalled();

    mounted.dispose();
  });

  test("leaves paste unswallowed when no clipboard payload is available", async () => {
    const mounted = await mountTerminal();

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        readText: vi.fn().mockResolvedValue(""),
        read: vi.fn().mockResolvedValue([]),
      },
    });

    const event = dispatchPaste(mounted.textarea, undefined);
    await flushTerminalMount();

    expect(event.defaultPrevented).toBe(false);
    expect(mounted.term.paste).not.toHaveBeenCalled();
    expect(mounted.term.input).not.toHaveBeenCalled();

    mounted.dispose();
  });

  test("forwards wheel as sgr mouse input when mouse tracking is active", async () => {
    const mounted = await mountTerminal();

    mounted.term.wasmTerm.hasMouseTracking.mockReturnValue(true);
    mounted.term.wasmTerm.isAlternateScreen.mockReturnValue(true);
    mounted.term.wasmTerm.getMode.mockImplementation((mode: number) => mode === 1006);
    setRect(mounted.term.element!, { left: 10, top: 20, width: 800, height: 480 });

    const handler = mounted.term.customWheelEventHandler;
    if (!handler) {
      throw new Error("Expected custom wheel handler to be attached");
    }

    const didHandle = handler(new WheelEvent("wheel", {
      clientX: 210,
      clientY: 140,
      deltaMode: WheelEvent.DOM_DELTA_PIXEL,
      deltaY: 100,
    }));

    expect(didHandle).toBe(true);
    expect(mounted.term.input).toHaveBeenCalledWith(
      "\x1b[<65;21;7M\x1b[<65;21;7M\x1b[<65;21;7M",
      true,
    );

    mounted.dispose();
  });

  test("preserves default wheel behavior when mouse tracking is inactive", async () => {
    const mounted = await mountTerminal();

    mounted.term.wasmTerm.hasMouseTracking.mockReturnValue(false);
    mounted.term.wasmTerm.isAlternateScreen.mockReturnValue(true);
    setRect(mounted.term.element!, { left: 10, top: 20, width: 800, height: 480 });

    const handler = mounted.term.customWheelEventHandler;
    if (!handler) {
      throw new Error("Expected custom wheel handler to be attached");
    }

    const didHandle = handler(new WheelEvent("wheel", {
      clientX: 210,
      clientY: 140,
      deltaMode: WheelEvent.DOM_DELTA_PIXEL,
      deltaY: -50,
    }));

    expect(didHandle).toBe(false);
    expect(mounted.term.input).not.toHaveBeenCalled();

    mounted.dispose();
  });
});
