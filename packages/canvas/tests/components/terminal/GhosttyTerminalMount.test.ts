import { afterEach, describe, expect, test, vi } from "vitest";
import { render } from "solid-js/web";

type TMockGhosttyTerminal = {
  element: HTMLDivElement | null;
  textarea: HTMLTextAreaElement | null;
  paste: ReturnType<typeof vi.fn>;
  input: ReturnType<typeof vi.fn>;
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
    #onData: ((data: string) => void) | null = null;
    #onResize: ((next: { cols: number; rows: number }) => void) | null = null;

    constructor(_: unknown) {
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
  items?: Array<{ kind?: string; type?: string }>;
  files?: unknown[];
};

async function flushTerminalMount() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function mountTerminal(args?: { onData?: (data: string) => void }) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const onData = args?.onData ?? vi.fn();
  const onReady = vi.fn();
  const dispose = render(() => GhosttyTerminalMount({ onReady, onData }), container);
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
  test("emits ctrl-v input for direct non-text paste", async () => {
    const mounted = await mountTerminal();

    const event = dispatchPaste(mounted.textarea, {
      types: ["Files", "image/png"],
      items: [{ kind: "file", type: "image/png" }],
      files: [{ name: "image.png" }],
    });

    expect(event.defaultPrevented).toBe(true);
    expect(mounted.term.input).toHaveBeenCalledWith("\x16", true);
    expect(mounted.term.paste).not.toHaveBeenCalled();

    mounted.dispose();
  });

  test("uses clipboard fallback to emit ctrl-v for non-text paste", async () => {
    const mounted = await mountTerminal();

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        readText: vi.fn().mockResolvedValue(""),
        read: vi.fn().mockResolvedValue([{ types: ["image/png"] }]),
      },
    });

    const event = dispatchPaste(mounted.textarea, {
      types: [],
      items: [],
      files: [],
    });

    await flushTerminalMount();

    expect(event.defaultPrevented).toBe(false);
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
});
