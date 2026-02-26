import {
  clearTerminalSessionState,
  extractCursorFromControlFrame,
  extractCursorFromMessageData,
  loadTerminalSessionState,
  opencodePtyService,
  saveTerminalSessionState,
  type TPty,
} from "@/services/opencode-pty";
import { orpcWebsocketService } from "@/services/orpc-websocket";
import { init as initGhostty, Terminal as GhosttyTerminal } from "ghostty-web";
import { createMemo, createSignal, onCleanup, onMount } from "solid-js";

type TCreateTerminalContextArgs = {
  terminalKey: string;
  workingDirectory: string;
  title?: string;
};

const DEFAULT_ROWS = 24;
const DEFAULT_COLS = 80;
const MIN_ROWS = 8;
const MIN_COLS = 20;
const FALLBACK_CELL_WIDTH = 8;
const FALLBACK_CELL_HEIGHT = 18;

let ghosttyInitPromise: Promise<void> | null = null;

function ensureGhosttyInit(): Promise<void> {
  if (!ghosttyInitPromise) {
    ghosttyInitPromise = initGhostty();
  }
  return ghosttyInitPromise;
}

function asArrayBufferFromBlob(blob: Blob): Promise<ArrayBuffer> {
  return blob.arrayBuffer();
}

function getCellSize(term: InstanceType<typeof GhosttyTerminal> | null): { width: number; height: number } {
  const metrics = (term as any)?.renderer?.getMetrics?.();
  const width = Number(metrics?.width);
  const height = Number(metrics?.height);

  return {
    width: Number.isFinite(width) && width > 0 ? width : FALLBACK_CELL_WIDTH,
    height: Number.isFinite(height) && height > 0 ? height : FALLBACK_CELL_HEIGHT,
  };
}

function getViewportY(term: InstanceType<typeof GhosttyTerminal> | null): number {
  if (!term) return 0;

  try {
    const viewportY = term.getViewportY();
    if (Number.isFinite(viewportY)) return Math.max(0, Math.floor(viewportY));
  } catch {
    // no-op
  }

  return Math.max(0, term.buffer.active.viewportY ?? 0);
}

function calculateTerminalSize(
  host: HTMLElement,
  term: InstanceType<typeof GhosttyTerminal> | null,
): { rows: number; cols: number } {
  const { width: cellWidth, height: cellHeight } = getCellSize(term);
  const cols = Math.max(MIN_COLS, Math.floor(host.clientWidth / cellWidth));
  const rows = Math.max(MIN_ROWS, Math.floor(host.clientHeight / cellHeight));
  return { rows, cols };
}

export function createTerminalContextLogic(args: TCreateTerminalContextArgs) {
  const [status, setStatus] = createSignal<"idle" | "connecting" | "connected" | "error">("idle");
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
  const [pty, setPty] = createSignal<TPty | null>(null);
  const [cursor, setCursor] = createSignal(0);
  const [size, setSize] = createSignal({ rows: DEFAULT_ROWS, cols: DEFAULT_COLS });

  let terminalRootRef: HTMLDivElement | undefined;
  let resizeHostRef: HTMLDivElement | undefined;
  let resizeObserver: ResizeObserver | null = null;
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  let sizePushTimer: ReturnType<typeof setTimeout> | null = null;
  let term: InstanceType<typeof GhosttyTerminal> | null = null;
  let connection: ReturnType<typeof opencodePtyService.connect> | null = null;
  let hasAuthoritativeCursor = false;

  const terminalTitle = createMemo(() => pty()?.title ?? args.title ?? "Terminal");

  const persistState = () => {
    const current = pty();
    if (!current) return;

    saveTerminalSessionState({
      terminalKey: args.terminalKey,
      workingDirectory: args.workingDirectory,
      ptyID: current.id,
      cursor: cursor(),
      rows: term?.rows ?? size().rows,
      cols: term?.cols ?? size().cols,
      title: current.title || terminalTitle(),
      scrollY: getViewportY(term),
    });
  };

  const closeConnection = () => {
    if (!connection) return;
    connection.close();
    connection = null;
  };

  const pushSizeToBackend = (rows: number, cols: number) => {
    if (sizePushTimer) clearTimeout(sizePushTimer);
    sizePushTimer = setTimeout(async () => {
      const current = pty();
      if (!current) return;

      await opencodePtyService.update(args.workingDirectory, current.id, {
        size: { rows, cols },
      });
    }, 120);
  };

  const scheduleResizeSync = () => {
    if (!term || !terminalRootRef) return;
    if (resizeTimer) clearTimeout(resizeTimer);

    resizeTimer = setTimeout(() => {
      if (!term || !terminalRootRef) return;

      const next = calculateTerminalSize(terminalRootRef, term);
      if (next.cols === term.cols && next.rows === term.rows) return;
      term.resize(next.cols, next.rows);
    }, 120);
  };

  const setAuthoritativeCursor = (value: number) => {
    hasAuthoritativeCursor = true;
    setCursor(value);
    persistState();
  };

  const handleBinaryFrame = (arrayBuffer: ArrayBuffer) => {
    if (!term) return;

    const controlCursor = extractCursorFromControlFrame(arrayBuffer);
    if (typeof controlCursor === "number") {
      setAuthoritativeCursor(controlCursor);
      return;
    }

    const decoded = new TextDecoder().decode(arrayBuffer);
    const jsonCursor = extractCursorFromMessageData(decoded);
    if (typeof jsonCursor === "number") {
      setAuthoritativeCursor(jsonCursor);
      return;
    }

    term.write(decoded);
    if (!hasAuthoritativeCursor) {
      setCursor((prev) => prev + arrayBuffer.byteLength);
    }
  };

  const connect = (ptyID: string, cursorValue: number) => {
    closeConnection();
    setStatus("connecting");

    connection = opencodePtyService.connect({
      workingDirectory: args.workingDirectory,
      ptyID,
      cursor: cursorValue,
      onOpen: () => {
        setStatus("connected");
        setErrorMessage(null);
      },
      onClose: () => {
        setStatus("idle");
      },
      onError: () => {
        setStatus("error");
        setErrorMessage("Terminal stream failed");
      },
      onMessage: (event) => {
        if (!term) return;

        if (event.data instanceof ArrayBuffer) {
          handleBinaryFrame(event.data);
          return;
        }

        if (event.data instanceof Blob) {
          void asArrayBufferFromBlob(event.data).then((arrayBuffer) => {
            handleBinaryFrame(arrayBuffer);
          });
          return;
        }

        if (typeof event.data === "string") {
          const jsonCursor = extractCursorFromMessageData(event.data);
          if (typeof jsonCursor === "number") {
            setAuthoritativeCursor(jsonCursor);
            return;
          }

          term.write(event.data);
          if (!hasAuthoritativeCursor) {
            setCursor((prev) => prev + event.data.length);
          }
        }
      },
    });

    connection.socket.addEventListener("close", (event) => {
      if (event.code !== 1000) {
        setErrorMessage(`Terminal disconnected (${event.code}${event.reason ? `: ${event.reason}` : ""})`);
      }
      if (event.code !== 1000) {
        console.warn("[terminal] websocket closed", { code: event.code, reason: event.reason });
      }
    });
  };

  const ensurePty = async () => {
    const restored = loadTerminalSessionState(args.terminalKey);

    if (restored?.ptyID) {
      const [getError, existing] = await orpcWebsocketService.safeClient.api.opencode.pty.get({
        workingDirectory: args.workingDirectory,
        path: { ptyID: restored.ptyID },
      });

      if (!getError && existing) {
        setPty(existing);
        setCursor(restored.cursor);
        setSize({ rows: restored.rows, cols: restored.cols });

        if (term) {
          term.resize(restored.cols, restored.rows);
          if (typeof restored.scrollY === "number") {
            requestAnimationFrame(() => {
              term?.scrollToLine(restored.scrollY!);
            });
          }
        }

        connect(existing.id, 0);
        return;
      }

      clearTerminalSessionState(args.terminalKey);
    }

    const [createError, created] = await orpcWebsocketService.safeClient.api.opencode.pty.create({
      workingDirectory: args.workingDirectory,
      body: { title: args.title ?? "Terminal" },
    });

    if (createError || !created) {
      setStatus("error");
      setErrorMessage("Failed to create terminal session");
      return;
    }

    setPty(created);
    setCursor(0);
    setSize({ rows: DEFAULT_ROWS, cols: DEFAULT_COLS });
    saveTerminalSessionState({
      terminalKey: args.terminalKey,
      workingDirectory: args.workingDirectory,
      ptyID: created.id,
      cursor: 0,
      rows: DEFAULT_ROWS,
      cols: DEFAULT_COLS,
      title: created.title,
      scrollY: 0,
    });
    connect(created.id, 0);
  };

  const removeTerminal = async () => {
    const current = pty();
    if (!current) return;

    closeConnection();
    await opencodePtyService.remove(args.workingDirectory, current.id);
    clearTerminalSessionState(args.terminalKey);
    term?.clear();
    setPty(null);
    setStatus("idle");
  };

  const setTerminalRootRef = (el: HTMLDivElement) => {
    terminalRootRef = el;
  };

  const setResizeHostRef = (el: HTMLDivElement) => {
    resizeHostRef = el;
  };

  onMount(async () => {
    await ensureGhosttyInit();

    if (!terminalRootRef || !resizeHostRef) {
      setStatus("error");
      setErrorMessage("Terminal host is missing");
      return;
    }

    terminalRootRef.style.caretColor = "transparent";
    terminalRootRef.style.outline = "none";

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

    term.open(terminalRootRef);

    if (term.element) {
      term.element.style.caretColor = "transparent";
      term.element.style.outline = "none";
    }

    if (term.textarea) {
      term.textarea.style.caretColor = "transparent";
    }

    term.onData((data) => {
      connection?.send(data);
    });

    term.onResize((next) => {
      setSize({ cols: next.cols, rows: next.rows });
      persistState();
      pushSizeToBackend(next.rows, next.cols);
    });

    resizeObserver = new ResizeObserver(() => {
      scheduleResizeSync();
    });
    resizeObserver.observe(resizeHostRef);

    await ensurePty();
    requestAnimationFrame(() => {
      scheduleResizeSync();
    });
  });

  onCleanup(() => {
    persistState();
    closeConnection();
    resizeObserver?.disconnect();
    if (resizeTimer) clearTimeout(resizeTimer);
    if (sizePushTimer) clearTimeout(sizePushTimer);
    term?.dispose();
    term = null;
  });

  return {
    status,
    errorMessage,
    terminalTitle,
    removeTerminal,
    setTerminalRootRef,
    setResizeHostRef,
  };
}
