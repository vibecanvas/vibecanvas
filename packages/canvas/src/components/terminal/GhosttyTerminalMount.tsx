import { init as initGhostty, Terminal as GhosttyTerminal } from "ghostty-web";
import { onCleanup, onMount } from "solid-js";

export type TGhosttyTerminalInstance = InstanceType<typeof GhosttyTerminal>;

export type TTerminalMountReadyArgs = {
  term: TGhosttyTerminalInstance;
  root: HTMLDivElement;
  host: HTMLDivElement;
};

type TGhosttyTerminalMountProps = {
  class?: string;
  onReady: (args: TTerminalMountReadyArgs) => void | Promise<void>;
  onData?: (data: string) => void;
  onResize?: (next: { cols: number; rows: number }) => void;
  onCleanup?: (term: TGhosttyTerminalInstance | null) => void;
};

let ghosttyInitPromise: Promise<void> | null = null;

const TERMINAL_DEBUG_STORAGE_KEY = "vibecanvas:terminal:debug";
const TERMINAL_PASTE_DEBUG_PREFIX = "[terminal:paste]";

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

function isTerminalPasteDebugEnabled() {
  try {
    return localStorage.getItem(TERMINAL_DEBUG_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function debugTerminalPaste(message: string, payload?: Record<string, unknown>) {
  if (!isTerminalPasteDebugEnabled()) return;
  if (payload) {
    console.debug(TERMINAL_PASTE_DEBUG_PREFIX, message, payload);
    return;
  }
  console.debug(TERMINAL_PASTE_DEBUG_PREFIX, message);
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
  return {
    tagName: value.tagName,
    dataset: { ...value.dataset },
  };
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

    term = new GhosttyTerminal({
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

    const sendTerminalInput = (data: string) => {
      const input = (term as { input?: (next: string, fromPaste?: boolean) => void } | null)?.input;
      if (typeof input === "function") {
        input.call(term, data, true);
        return "term.input";
      }

      props.onData?.(data);
      return props.onData ? "onData" : "none";
    };

    const pasteText = (text: string) => {
      const paste = (term as { paste?: (next: string) => void } | null)?.paste;
      if (typeof paste === "function") {
        paste.call(term, text);
        return "term.paste";
      }

      props.onData?.(text);
      return props.onData ? "onData" : "none";
    };

    const handlePaste = (event: ClipboardEvent) => {
      if (!term) return;
      if (event.defaultPrevented) return;

      const summary = summarizeClipboardData(event.clipboardData);
      debugTerminalPaste("paste event", {
        activeElement: describeElement(document.activeElement),
        target: describeElement(event.target),
        currentTarget: describeElement(event.currentTarget),
        hostContainsActiveElement: !!hostRef?.contains(document.activeElement),
        ...summary,
      });

      const text = getClipboardText(event.clipboardData);
      if (text) {
        event.preventDefault();
        event.stopPropagation();
        const method = pasteText(text);
        debugTerminalPaste("handled text paste", {
          method,
          textLength: text.length,
        });
        return;
      }

      if (summary.hasNonText) {
        event.preventDefault();
        event.stopPropagation();
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
      props.onResize?.(next);
    });

    await props.onReady({ term, root: rootRef, host: hostRef });
  });

  onCleanup(() => {
    disposed = true;
    cleanupPasteListeners?.();
    cleanupPasteListeners = null;
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
