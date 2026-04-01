import { init as initGhostty, Terminal as GhosttyTerminal } from "ghostty-web";
import { onCleanup, onMount } from "solid-js";

type TGhosttyTheme = {
  background: string;
  foreground: string;
  cursor: string;
  selectionBackground: string;
};

type TGhosttyTerminalOptions = {
  cursorBlink: boolean;
  cursorStyle: string;
  fontFamily: string;
  fontSize: number;
  scrollback: number;
  theme: TGhosttyTheme;
};

type TGhosttyDisposable = {
  dispose: () => void;
};

export type TGhosttyTerminalInstance = {
  cols: number;
  rows: number;
  element?: HTMLDivElement | null;
  textarea?: HTMLTextAreaElement | null;
  canvas?: HTMLCanvasElement | null;
  renderer?: TGhosttyRendererLike;
  wasmTerm?: TGhosttyWasmTerminalLike;
  attachCustomWheelEventHandler?: (handler?: (event: WheelEvent) => boolean) => void;
  open: (root: HTMLDivElement) => void;
  onData: (handler: (data: string) => void) => TGhosttyDisposable | void;
  onResize: (handler: (next: { cols: number; rows: number }) => void) => TGhosttyDisposable | void;
  resize: (cols: number, rows: number) => void;
  write: (data: string) => void;
  clear: () => void;
  dispose: () => void;
  paste?: (next: string) => void;
  input?: (next: string, fromPaste?: boolean) => void;
  getViewportY?: () => number;
  scrollToLine?: (line: number) => void;
};

export type TTerminalMountReadyArgs = {
  term: TGhosttyTerminalInstance;
  root: HTMLDivElement;
  host: HTMLDivElement;
};

type TGhosttyTerminalMountProps = {
  class?: string;
  onReady: (args: TTerminalMountReadyArgs) => void | Promise<void>;
  onData?: (data: string) => void;
  onResize?: (next: { cols: number; rows: number }, term: TGhosttyTerminalInstance | null) => void;
  onCleanup?: (term: TGhosttyTerminalInstance | null) => void;
};

let ghosttyInitPromise: Promise<void> | null = null;

const TERMINAL_DEBUG_STORAGE_KEY = "vibecanvas:terminal:debug";
const TERMINAL_PASTE_DEBUG_PREFIX = "[terminal:paste]";
const TERMINAL_WHEEL_DEBUG_PREFIX = "[terminal:wheel]";
const TERMINAL_WHEEL_PIXEL_STEP = 33;
const TERMINAL_WHEEL_MAX_STEPS = 5;
const TERMINAL_MOUSE_WHEEL_UP_BUTTON = 64;
const TERMINAL_MOUSE_WHEEL_DOWN_BUTTON = 65;
const TERMINAL_MOUSE_SGR_MODE = 1006;

type TGhosttyWasmTerminalLike = {
  isAlternateScreen?: () => boolean;
  hasMouseTracking?: () => boolean;
  getMode?: (mode: number, isAnsi?: boolean) => boolean;
  getDimensions?: () => { cols: number; rows: number };
};

type TGhosttyRendererLike = {
  getMetrics?: () => { width: number; height: number };
};

type TGhosttyTerminalInternal = TGhosttyTerminalInstance;

type TTerminalBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type TTerminalCellCoordinates = {
  col: number;
  row: number;
};

type TClipboardLike = {
  getData?: (type: string) => string;
  types?: Iterable<string> | ArrayLike<string>;
  items?: Iterable<{ kind?: string; type?: string }> | ArrayLike<{ kind?: string; type?: string }>;
  files?: ArrayLike<unknown>;
};

type TClipboardSummary = {
  types: string[];
  items: Array<{ kind: string; type: string }>;
  fileCount: number;
  textLength: number;
  hasNonText: boolean;
  hasAnyPayload: boolean;
};

type TClipboardEventLike = Event & {
  clipboardData?: TClipboardLike | null;
};

function isTerminalDebugEnabled() {
  try {
    return localStorage.getItem(TERMINAL_DEBUG_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function debugTerminalPaste(message: string, payload?: Record<string, unknown>) {
  if (!isTerminalDebugEnabled()) return;
  if (payload) {
    console.debug(TERMINAL_PASTE_DEBUG_PREFIX, message, payload);
    return;
  }
  console.debug(TERMINAL_PASTE_DEBUG_PREFIX, message);
}

function debugTerminalWheel(message: string, payload?: Record<string, unknown>) {
  if (!isTerminalDebugEnabled()) return;
  if (payload) {
    console.debug(TERMINAL_WHEEL_DEBUG_PREFIX, message, payload);
    return;
  }
  console.debug(TERMINAL_WHEEL_DEBUG_PREFIX, message);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getTerminalBounds(term: TGhosttyTerminalInternal): TTerminalBounds | null {
  const rectSource = term.canvas ?? term.element;
  if (rectSource) {
    const rect = rectSource.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
    }

    const metrics = term.renderer?.getMetrics?.();
    const fallbackCols = term.wasmTerm?.getDimensions?.().cols ?? term.cols;
    const fallbackRows = term.wasmTerm?.getDimensions?.().rows ?? term.rows;
    if (metrics?.width && metrics?.height && fallbackCols > 0 && fallbackRows > 0) {
      return {
        left: rect.left,
        top: rect.top,
        width: metrics.width * fallbackCols,
        height: metrics.height * fallbackRows,
      };
    }
  }

  return null;
}

function getTerminalCellCoordinates(term: TGhosttyTerminalInternal, event: WheelEvent): TTerminalCellCoordinates | null {
  const bounds = getTerminalBounds(term);
  const cols = term.wasmTerm?.getDimensions?.().cols ?? term.cols;
  const rows = term.wasmTerm?.getDimensions?.().rows ?? term.rows;

  if (!bounds || cols <= 0 || rows <= 0 || bounds.width <= 0 || bounds.height <= 0) {
    return null;
  }

  const localX = clamp(event.clientX - bounds.left, 0, bounds.width);
  const localY = clamp(event.clientY - bounds.top, 0, bounds.height);

  return {
    col: clamp(Math.floor(localX / (bounds.width / cols)) + 1, 1, cols),
    row: clamp(Math.floor(localY / (bounds.height / rows)) + 1, 1, rows),
  };
}

function getWheelStepCount(event: WheelEvent) {
  const delta = Math.abs(event.deltaY);
  if (delta === 0) return 0;

  let normalized = 0;
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    normalized = delta;
  } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    normalized = delta * 3;
  } else {
    normalized = delta / TERMINAL_WHEEL_PIXEL_STEP;
  }

  return clamp(Math.max(1, Math.round(normalized)), 1, TERMINAL_WHEEL_MAX_STEPS);
}

function getWheelMouseButton(event: WheelEvent) {
  if (event.deltaY === 0) return null;

  const modifierMask = (event.shiftKey ? 4 : 0)
    + (event.altKey ? 8 : 0)
    + (event.ctrlKey ? 16 : 0);

  return (event.deltaY > 0 ? TERMINAL_MOUSE_WHEEL_DOWN_BUTTON : TERMINAL_MOUSE_WHEEL_UP_BUTTON)
    + modifierMask;
}

function buildWheelMouseSequence(term: TGhosttyTerminalInternal, event: WheelEvent) {
  const coords = getTerminalCellCoordinates(term, event);
  const button = getWheelMouseButton(event);
  const steps = getWheelStepCount(event);
  if (!coords || button === null || steps <= 0) return null;

  const sequence = Array.from(
    { length: steps },
    () => `\x1b[<${button};${coords.col};${coords.row}M`,
  ).join("");

  return {
    button,
    col: coords.col,
    row: coords.row,
    sequence,
    steps,
  };
}

function getClipboardText(clipboardData: TClipboardLike | null | undefined) {
  if (!clipboardData?.getData) return "";
  return clipboardData.getData("text/plain") || clipboardData.getData("text") || "";
}

function isNonTextClipboardType(type: string) {
  return type === "Files" || (!type.startsWith("text/") && type !== "text");
}

function summarizeClipboardData(clipboardData: TClipboardLike | null | undefined): TClipboardSummary {
  const types = clipboardData?.types ? Array.from(clipboardData.types) : [];
  const items = clipboardData?.items
    ? Array.from(clipboardData.items, (item) => ({
      kind: item?.kind ?? "",
      type: item?.type ?? "",
    }))
    : [];
  const fileCount = clipboardData?.files?.length ?? 0;
  const textLength = getClipboardText(clipboardData).length;
  const hasNonText = fileCount > 0
    || items.some((item) => item.kind === "file" || isNonTextClipboardType(item.type))
    || types.some(isNonTextClipboardType);

  return {
    types,
    items,
    fileCount,
    textLength,
    hasNonText,
    hasAnyPayload: textLength > 0 || hasNonText || types.length > 0 || items.length > 0 || fileCount > 0,
  };
}

function describeElement(value: EventTarget | Element | null | undefined) {
  if (!(value instanceof Element)) return null;
  const htmlValue = value as HTMLElement;
  return {
    tagName: value.tagName,
    dataset: { ...htmlValue.dataset },
  };
}

function asClipboardEventLike(event: Event): TClipboardEventLike {
  return event as TClipboardEventLike;
}

async function readClipboardFallback() {
  const clipboard = navigator.clipboard;
  if (!clipboard) {
    return { kind: "none" as const, reason: "clipboard-unavailable" };
  }

  try {
    const text = await clipboard.readText?.();
    if (text) {
      return { kind: "text" as const, text };
    }
  } catch (error) {
    debugTerminalPaste("fallback readText failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const items = await clipboard.read?.();
    const hasNonText = items?.some((item) => item.types.some(isNonTextClipboardType)) ?? false;
    if (hasNonText) {
      return { kind: "non-text" as const };
    }
  } catch (error) {
    debugTerminalPaste("fallback read failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return { kind: "none" as const, reason: "clipboard-empty" };
}

function ensureGhosttyInit(): Promise<void> {
  if (!ghosttyInitPromise) {
    ghosttyInitPromise = initGhostty();
  }

  return ghosttyInitPromise;
}

export function GhosttyTerminalMount(props: TGhosttyTerminalMountProps) {
  const GhosttyTerminalCtor = GhosttyTerminal as unknown as new (options: TGhosttyTerminalOptions) => TGhosttyTerminalInstance;
  let hostRef: HTMLDivElement | undefined;
  let rootRef: HTMLDivElement | undefined;
  let term: TGhosttyTerminalInstance | null = null;
  let disposed = false;
  let cleanupPasteListeners: (() => void) | null = null;

  onMount(async () => {
    await ensureGhosttyInit();

    if (disposed || !hostRef || !rootRef) return;

    rootRef.style.caretColor = "transparent";
    rootRef.style.outline = "none";

    term = new GhosttyTerminalCtor({
      cursorBlink: true,
      cursorStyle: "bar",
      fontFamily: "JetBrains Mono Variable, monospace",
      fontSize: 13,
      scrollback: 10000,
      theme: {
        background: "#111214",
        foreground: "#e5e7eb",
        cursor: "#f59e0b",
        selectionBackground: "#374151",
      },
    });

    term.open(rootRef);

    if (term.element) {
      term.element.style.caretColor = "transparent";
      term.element.style.outline = "none";
    }

    if (term.textarea) {
      term.textarea.style.caretColor = "transparent";
      term.textarea.dataset.ghosttyTerminalTextarea = "true";
    }

    const terminalInternal = term as TGhosttyTerminalInternal;

    const sendTerminalInput = (data: string) => {
      const input = term?.input;
      if (typeof input === "function") {
        input.call(term, data, true);
        return "term.input";
      }

      props.onData?.(data);
      return props.onData ? "onData" : "none";
    };

    const pasteText = (text: string) => {
      const paste = term?.paste;
      if (typeof paste === "function") {
        paste.call(term, text);
        return "term.paste";
      }

      props.onData?.(text);
      return props.onData ? "onData" : "none";
    };

    terminalInternal.attachCustomWheelEventHandler?.((event) => {
      const wasmTerm = terminalInternal.wasmTerm;
      const alternateScreen = wasmTerm?.isAlternateScreen?.() ?? false;
      const mouseTracking = wasmTerm?.hasMouseTracking?.() ?? false;
      const sgrMouseMode = wasmTerm?.getMode?.(TERMINAL_MOUSE_SGR_MODE, false) ?? false;

      if (!mouseTracking) {
        debugTerminalWheel("leaving wheel to ghostty default handler", {
          alternateScreen,
          deltaMode: event.deltaMode,
          deltaY: event.deltaY,
          mouseTracking,
          sgrMouseMode,
        });
        return false;
      }

      const wheelSequence = buildWheelMouseSequence(terminalInternal, event);
      if (!wheelSequence) {
        debugTerminalWheel("failed to encode wheel mouse sequence", {
          alternateScreen,
          deltaMode: event.deltaMode,
          deltaY: event.deltaY,
          mouseTracking,
          sgrMouseMode,
        });
        return false;
      }

      const method = sendTerminalInput(wheelSequence.sequence);
      debugTerminalWheel("forwarded wheel as sgr mouse input", {
        alternateScreen,
        button: wheelSequence.button,
        col: wheelSequence.col,
        deltaMode: event.deltaMode,
        deltaY: event.deltaY,
        method,
        mouseTracking,
        row: wheelSequence.row,
        sgrMouseMode,
        steps: wheelSequence.steps,
      });
      return true;
    });

    const handlePaste = (event: Event) => {
      const clipboardEvent = asClipboardEventLike(event);
      if (!term) return;
      if (clipboardEvent.defaultPrevented) return;

      const summary = summarizeClipboardData(clipboardEvent.clipboardData);
      debugTerminalPaste("paste event", {
        activeElement: describeElement(document.activeElement),
        target: describeElement(clipboardEvent.target),
        currentTarget: describeElement(clipboardEvent.currentTarget),
        hostContainsActiveElement: !!hostRef?.contains(document.activeElement),
        ...summary,
      });

      const text = getClipboardText(clipboardEvent.clipboardData);
      if (text) {
        clipboardEvent.preventDefault();
        clipboardEvent.stopPropagation();
        const method = pasteText(text);
        debugTerminalPaste("handled text paste", {
          method,
          textLength: text.length,
        });
        return;
      }

      if (summary.hasNonText) {
        clipboardEvent.preventDefault();
        clipboardEvent.stopPropagation();
        const method = sendTerminalInput("\x16");
        debugTerminalPaste("handled non-text paste", {
          method,
          signal: "\\x16",
        });
        return;
      }

      if (!summary.hasAnyPayload) {
        void readClipboardFallback().then((result) => {
          if (disposed || !term) return;

          if (result.kind === "text") {
            const method = pasteText(result.text);
            debugTerminalPaste("handled fallback text paste", {
              method,
              textLength: result.text.length,
            });
            return;
          }

          if (result.kind === "non-text") {
            const method = sendTerminalInput("\x16");
            debugTerminalPaste("handled fallback non-text paste", {
              method,
              signal: "\\x16",
            });
            return;
          }

          debugTerminalPaste("left paste unhandled", {
            reason: result.reason,
          });
        });
        return;
      }

      debugTerminalPaste("left paste to terminal default handler", {
        reason: "unsupported-direct-payload",
      });
    };

    const pasteTargets = [hostRef, rootRef, term.element, term.textarea].filter((value): value is HTMLDivElement | HTMLTextAreaElement => Boolean(value));
    pasteTargets.forEach((target) => {
      target.addEventListener("paste", handlePaste, true);
    });
    cleanupPasteListeners = () => {
      pasteTargets.forEach((target) => {
        target.removeEventListener("paste", handlePaste, true);
      });
    };

    term.onData((data) => {
      props.onData?.(data);
    });

    term.onResize((next) => {
      props.onResize?.(next, term);
    });

    await props.onReady({ term, root: rootRef, host: hostRef });
  });

  onCleanup(() => {
    disposed = true;
    cleanupPasteListeners?.();
    cleanupPasteListeners = null;
    (term as TGhosttyTerminalInternal | null)?.attachCustomWheelEventHandler?.(undefined);
    props.onCleanup?.(term);
    term?.dispose();
    term = null;
  });

  return (
    <div
      ref={hostRef}
      data-ghostty-terminal-host="true"
      class={props.class ?? "h-full w-full flex-1 overflow-hidden bg-[#111214]"}
      style={{ "min-width": "0", "min-height": "0" }}
    >
      <div
        ref={rootRef}
        data-ghostty-terminal-root="true"
        class="h-full w-full"
        style={{ "min-width": "0", "min-height": "0" }}
      />
    </div>
  );
}
