import { createMemo, createSignal } from "solid-js";
import type { TTerminalSafeClient, TPty } from "../../services/canvas/interface";
import {
  clearTerminalSessionState,
  createPtyService,
  extractCursorFromControlFrame,
  extractCursorFromMessageData,
  loadTerminalSessionState,
  saveTerminalSessionState,
} from "../../services/terminal/pty";
import type { TGhosttyTerminalInstance, TTerminalMountReadyArgs } from "./GhosttyTerminalMount";

type TCreateTerminalContextArgs = {
  terminalKey: string;
  workingDirectory: string;
  title?: string;
  safeClient: TTerminalSafeClient;
};

const DEFAULT_ROWS = 24;
const DEFAULT_COLS = 80;
const MIN_ROWS = 8;
const MIN_COLS = 20;
const FALLBACK_CELL_WIDTH = 8;
const FALLBACK_CELL_HEIGHT = 18;
// Temporary flag while terminal lifecycle sizing is still being tuned.
const ENABLE_TERMINAL_LIFECYCLE_DEBUG_LOGS = false;
const terminalLogicOwnership = new Map<string, symbol>();

function debugTerminalLifecycle(message: string, payload?: Record<string, unknown>) {
  if (!ENABLE_TERMINAL_LIFECYCLE_DEBUG_LOGS) return;

  if (payload) {
    console.debug("[terminal:lifecycle]", message, payload);
    return;
  }
  console.debug("[terminal:lifecycle]", message);
}

function asArrayBufferFromBlob(blob: Blob): Promise<ArrayBuffer> {
  return blob.arrayBuffer();
}

function getCellSize(term: TGhosttyTerminalInstance | null): { width: number; height: number } {
  const metrics = (term as any)?.renderer?.getMetrics?.();
  const width = Number(metrics?.width);
  const height = Number(metrics?.height);

  return {
    width: Number.isFinite(width) && width > 0 ? width : FALLBACK_CELL_WIDTH,
    height: Number.isFinite(height) && height > 0 ? height : FALLBACK_CELL_HEIGHT,
  };
}

function getViewportY(term: TGhosttyTerminalInstance | null): number {
  if (!term) return 0;

  try {
    const viewportY = term.getViewportY?.();
    if (typeof viewportY === "number" && Number.isFinite(viewportY)) {
      return Math.max(0, Math.floor(viewportY));
    }
  } catch {
    // no-op
  }

  return Math.max(0, (term as any)?.buffer?.active?.viewportY ?? 0);
}

function hasUsableHostSize(host: HTMLElement | undefined): host is HTMLElement {
  return Boolean(host && host.clientWidth > 0 && host.clientHeight > 0);
}

function getElementSize(element: { clientWidth: number; clientHeight: number } | null | undefined) {
  return {
    width: element?.clientWidth ?? 0,
    height: element?.clientHeight ?? 0,
  };
}

function calculateTerminalSize(
  host: HTMLElement,
  term: TGhosttyTerminalInstance | null,
): { rows: number; cols: number } {
  const { width: cellWidth, height: cellHeight } = getCellSize(term);
  const cols = Math.max(MIN_COLS, Math.floor(host.clientWidth / cellWidth));
  const rows = Math.max(MIN_ROWS, Math.floor(host.clientHeight / cellHeight));
  return { rows, cols };
}

export function createTerminalContextLogic(args: TCreateTerminalContextArgs) {
  const logicInstanceToken = Symbol(args.terminalKey);
  const ptyService = createPtyService(args.safeClient);
  const [status, setStatus] = createSignal<"idle" | "connecting" | "connected" | "error">("idle");
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
  const [pty, setPty] = createSignal<TPty | null>(null);
  const [cursor, setCursor] = createSignal(0);
  const [size, setSize] = createSignal({ rows: DEFAULT_ROWS, cols: DEFAULT_COLS });

  let terminalRootRef: HTMLDivElement | undefined;
  let terminalHostRef: HTMLDivElement | undefined;
  let resizeObserver: ResizeObserver | null = null;
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  let sizePushTimer: ReturnType<typeof setTimeout> | null = null;
  let term: TGhosttyTerminalInstance | null = null;
  let connection: ReturnType<typeof ptyService.connect> | null = null;
  let pendingInputBuffer = "";
  let hasAuthoritativeCursor = false;
  let activeMountSessionId = 0;
  let bootstrappedMountSessionId = 0;
  let suppressedResizeSourceTerm: TGhosttyTerminalInstance | null = null;

  const terminalTitle = createMemo(() => pty()?.title ?? args.title ?? "Terminal");

  const claimTerminalOwnership = () => {
    terminalLogicOwnership.set(args.terminalKey, logicInstanceToken);
  };

  const isTerminalOwner = () => terminalLogicOwnership.get(args.terminalKey) === logicInstanceToken;

  const releaseTerminalOwnership = () => {
    if (isTerminalOwner()) {
      terminalLogicOwnership.delete(args.terminalKey);
    }
  };

  const isActiveMountSession = (mountSessionId: number) => mountSessionId === activeMountSessionId;
  const canControlTerminal = (mountSessionId: number) => isActiveMountSession(mountSessionId) && isTerminalOwner();

  const resetMountTimersAndObservers = () => {
    resizeObserver?.disconnect();
    resizeObserver = null;
    if (resizeTimer) clearTimeout(resizeTimer);
    if (sizePushTimer) clearTimeout(sizePushTimer);
    resizeTimer = null;
    sizePushTimer = null;
  };

  const syncSizeToBackendNow = async (ptyID: string, rows: number, cols: number, reason: string) => {
    if (!isTerminalOwner()) return;
    debugTerminalLifecycle("pushing immediate backend size sync", {
      ptyID,
      rows,
      cols,
      reason,
    });

    const [updateError, updated] = await ptyService.update(args.workingDirectory, ptyID, {
      size: { rows, cols },
    });

    debugTerminalLifecycle("immediate backend size sync completed", {
      ptyID,
      rows,
      cols,
      reason,
      ok: !updateError && Boolean(updated),
      error: updateError instanceof Error
        ? updateError.message
        : (typeof updateError === "object" && updateError !== null && "message" in updateError
          ? String((updateError as { message?: unknown }).message)
          : updateError ?? null),
    });
  };

  const getAuthoritativeTerminalSize = (fallback?: { rows: number; cols: number }) => {
    const host = terminalHostRef;

    if (term && host && hasUsableHostSize(host)) {
      const measured = calculateTerminalSize(host, term);
      return {
        rows: measured.rows,
        cols: measured.cols,
        source: "measured" as const,
      };
    }

    if (fallback) {
      return {
        rows: fallback.rows,
        cols: fallback.cols,
        source: "saved" as const,
      };
    }

    return {
      rows: size().rows,
      cols: size().cols,
      source: "current" as const,
    };
  };

  const persistState = () => {
    const current = pty();
    if (!current) return;

    const nextState = {
      terminalKey: args.terminalKey,
      workingDirectory: args.workingDirectory,
      ptyID: current.id,
      cursor: cursor(),
      rows: term?.rows ?? size().rows,
      cols: term?.cols ?? size().cols,
      title: current.title || terminalTitle(),
      scrollY: getViewportY(term),
    };

    saveTerminalSessionState(nextState);
    debugTerminalLifecycle("persisted terminal session state", nextState);
  };

  const closeConnection = () => {
    if (!connection) return;
    debugTerminalLifecycle("closing websocket connection", {
      ptyID: pty()?.id ?? null,
      readyState: connection.socket.readyState,
    });
    connection.close();
    connection = null;
  };

  const flushPendingInput = () => {
    if (!pendingInputBuffer) return;
    if (!connection || connection.socket.readyState !== WebSocket.OPEN) return;
    connection.send(pendingInputBuffer);
    pendingInputBuffer = "";
  };

  const restartFrontend = async () => {
    debugTerminalLifecycle("restarting frontend", {
      ptyID: pty()?.id ?? null,
      status: status(),
    });
    persistState();
    closeConnection();
    setErrorMessage(null);
    setStatus("idle");
  };

  const pushSizeToBackend = (rows: number, cols: number) => {
    const current = pty();
    if (!current) {
      debugTerminalLifecycle("skipped backend size sync because pty is not ready", {
        rows,
        cols,
      });
      return;
    }

    if (sizePushTimer) clearTimeout(sizePushTimer);
    debugTerminalLifecycle("queued backend size sync", {
      ptyID: current.id,
      rows,
      cols,
      delayMs: 120,
    });
    sizePushTimer = setTimeout(async () => {
      const current = pty();
      if (!current) return;

      debugTerminalLifecycle("pushing backend size sync", {
        ptyID: current.id,
        rows,
        cols,
      });

      const [updateError, updated] = await ptyService.update(args.workingDirectory, current.id, {
        size: { rows, cols },
      });

      debugTerminalLifecycle("backend size sync completed", {
        ptyID: current.id,
        rows,
        cols,
        ok: !updateError && Boolean(updated),
        error: updateError instanceof Error
          ? updateError.message
          : (typeof updateError === "object" && updateError !== null && "message" in updateError
            ? String((updateError as { message?: unknown }).message)
            : updateError ?? null),
      });
    }, 120);
  };

  const scheduleResizeSync = () => {
    if (!isTerminalOwner()) return;
    const host = terminalHostRef;
    if (!term || !host) return;
    if (resizeTimer) clearTimeout(resizeTimer);
    const hostSize = getElementSize(host);

    debugTerminalLifecycle("scheduled frontend size measurement", {
      hostWidth: hostSize.width,
      hostHeight: hostSize.height,
      currentRows: term.rows,
      currentCols: term.cols,
      delayMs: 120,
    });

    resizeTimer = setTimeout(() => {
      const currentHost = terminalHostRef;
      if (!term || !currentHost) return;
      if (!hasUsableHostSize(currentHost)) {
        const currentHostSize = getElementSize(currentHost);
        debugTerminalLifecycle("skipped frontend resize because host size is zero", {
          hostWidth: currentHostSize.width,
          hostHeight: currentHostSize.height,
        });
        return;
      }

      const next = calculateTerminalSize(currentHost, term);
      const currentHostSize = getElementSize(currentHost);
      debugTerminalLifecycle("measured frontend terminal size", {
        hostWidth: currentHostSize.width,
        hostHeight: currentHostSize.height,
        measuredRows: next.rows,
        measuredCols: next.cols,
        currentRows: term.rows,
        currentCols: term.cols,
      });
      if (next.cols === term.cols && next.rows === term.rows) {
        debugTerminalLifecycle("skipped frontend resize because size is unchanged", {
          rows: next.rows,
          cols: next.cols,
        });
        return;
      }
      debugTerminalLifecycle("applying measured frontend resize", {
        fromRows: term.rows,
        fromCols: term.cols,
        toRows: next.rows,
        toCols: next.cols,
      });
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

  const connect = (ptyID: string, cursorValue: number, mountSessionId: number) => {
    if (!canControlTerminal(mountSessionId)) return;
    closeConnection();
    setStatus("connecting");
    debugTerminalLifecycle("connecting to pty websocket", {
      ptyID,
      cursor: cursorValue,
      rows: term?.rows ?? size().rows,
      cols: term?.cols ?? size().cols,
    });

    connection = ptyService.connect({
      workingDirectory: args.workingDirectory,
      ptyID,
      cursor: cursorValue,
      onOpen: () => {
        if (!canControlTerminal(mountSessionId)) return;
        setStatus("connected");
        setErrorMessage(null);
        flushPendingInput();
        debugTerminalLifecycle("pty websocket opened", { ptyID, cursor: cursorValue });
      },
      onClose: () => {
        if (!canControlTerminal(mountSessionId)) return;
        setStatus("idle");
        debugTerminalLifecycle("pty websocket closed cleanly", { ptyID });
      },
      onError: () => {
        if (!canControlTerminal(mountSessionId)) return;
        setStatus("error");
        setErrorMessage("Terminal stream failed");
        debugTerminalLifecycle("pty websocket error", { ptyID });
      },
      onMessage: (event) => {
        if (!canControlTerminal(mountSessionId)) return;
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
      if (!canControlTerminal(mountSessionId)) return;
      if (event.code !== 1000) {
        setErrorMessage(`Terminal disconnected (${event.code}${event.reason ? `: ${event.reason}` : ""})`);
      }
      if (event.code !== 1000) {
        console.warn("[terminal] websocket closed", { code: event.code, reason: event.reason });
      }
    });
  };

  const ensurePty = async (mountSessionId: number) => {
    if (!canControlTerminal(mountSessionId)) return;
    const restored = loadTerminalSessionState(args.terminalKey);
    debugTerminalLifecycle("loaded saved terminal session state", {
      terminalKey: args.terminalKey,
      restored,
    });

    if (restored?.ptyID) {
      const [getError, existing] = await ptyService.get(args.workingDirectory, restored.ptyID);
      if (!canControlTerminal(mountSessionId)) return;
      debugTerminalLifecycle("queried restored pty session", {
        ptyID: restored.ptyID,
        ok: !getError && Boolean(existing),
        error: getError instanceof Error
          ? getError.message
          : (typeof getError === "object" && getError !== null && "message" in getError
            ? String((getError as { message?: unknown }).message)
            : getError ?? null),
      });

      if (!getError && existing) {
        const reconnectSize = getAuthoritativeTerminalSize({ rows: restored.rows, cols: restored.cols });
        const replayCursor = 0;
        setPty(existing);
        setCursor(restored.cursor);
        setSize({ rows: reconnectSize.rows, cols: reconnectSize.cols });
        debugTerminalLifecycle("restoring existing pty session", {
          ptyID: existing.id,
          savedCursor: restored.cursor,
          replayCursor,
          restoredRows: restored.rows,
          restoredCols: restored.cols,
          connectRows: reconnectSize.rows,
          connectCols: reconnectSize.cols,
          sizeSource: reconnectSize.source,
          scrollY: restored.scrollY ?? null,
        });

        if (term) {
          debugTerminalLifecycle("applying saved terminal size before reconnect", {
            ptyID: existing.id,
            rows: reconnectSize.rows,
            cols: reconnectSize.cols,
            sizeSource: reconnectSize.source,
          });
          suppressedResizeSourceTerm = term;
          term.resize(reconnectSize.cols, reconnectSize.rows);
          if (typeof restored.scrollY === "number") {
            requestAnimationFrame(() => {
              if (!isActiveMountSession(mountSessionId)) return;
              term?.scrollToLine?.(restored.scrollY!);
            });
          }
        }

        await syncSizeToBackendNow(existing.id, reconnectSize.rows, reconnectSize.cols, "restore-before-connect");
        if (!canControlTerminal(mountSessionId)) return;

        connect(existing.id, replayCursor, mountSessionId);
        return;
      }

      clearTerminalSessionState(args.terminalKey);
      debugTerminalLifecycle("cleared stale saved terminal session state", {
        terminalKey: args.terminalKey,
        ptyID: restored.ptyID,
      });
    }

    const [createError, created] = await ptyService.create(args.workingDirectory, {
      title: args.title ?? "Terminal",
    });
    if (!canControlTerminal(mountSessionId)) return;

    if (createError || !created) {
      setStatus("error");
      setErrorMessage("Failed to create terminal session");
      return;
    }

    setPty(created);
    setCursor(0);
    const connectSize = getAuthoritativeTerminalSize({ rows: DEFAULT_ROWS, cols: DEFAULT_COLS });
    setSize({ rows: connectSize.rows, cols: connectSize.cols });
    debugTerminalLifecycle("created fresh pty session", {
      ptyID: created.id,
      rows: connectSize.rows,
      cols: connectSize.cols,
      sizeSource: connectSize.source,
    });
    saveTerminalSessionState({
      terminalKey: args.terminalKey,
      workingDirectory: args.workingDirectory,
      ptyID: created.id,
      cursor: 0,
      rows: connectSize.rows,
      cols: connectSize.cols,
      title: created.title,
      scrollY: 0,
    });
    if (term) {
      suppressedResizeSourceTerm = term;
      term.resize(connectSize.cols, connectSize.rows);
    }
    await syncSizeToBackendNow(created.id, connectSize.rows, connectSize.cols, "create-before-connect");
    if (!canControlTerminal(mountSessionId)) return;
    connect(created.id, 0, mountSessionId);
  };

  const removeTerminal = async () => {
    const current = pty();
    if (!current) return;

    closeConnection();
    await ptyService.remove(args.workingDirectory, current.id);
    clearTerminalSessionState(args.terminalKey);
    term?.clear();
    setPty(null);
    setStatus("idle");
  };

  const handleTerminalReady = async ({ term: nextTerm, root, host }: TTerminalMountReadyArgs) => {
    claimTerminalOwnership();
    activeMountSessionId += 1;
    const mountSessionId = activeMountSessionId;
    bootstrappedMountSessionId = 0;
    resetMountTimersAndObservers();
    closeConnection();
    term = nextTerm;
    terminalRootRef = root;
    terminalHostRef = host;
    const hostSize = getElementSize(host);
    const rootSize = getElementSize(root);
    debugTerminalLifecycle("terminal mount ready", {
      mountSessionId,
      hostWidth: hostSize.width,
      hostHeight: hostSize.height,
      rootWidth: rootSize.width,
      rootHeight: rootSize.height,
      currentRows: term.rows,
      currentCols: term.cols,
    });

    const bootstrapReadyMount = async (mode: "measured" | "fallback" = "measured") => {
      if (!canControlTerminal(mountSessionId)) return;
      if (bootstrappedMountSessionId === mountSessionId) return;
      if (mode === "measured" && !hasUsableHostSize(host)) {
        const hostSize = getElementSize(host);
        debugTerminalLifecycle("waiting for non-zero terminal host size before bootstrap", {
          mountSessionId,
          hostWidth: hostSize.width,
          hostHeight: hostSize.height,
        });
        return;
      }

      bootstrappedMountSessionId = mountSessionId;
      if (mode === "measured") {
        scheduleResizeSync();
      } else {
        const hostSize = getElementSize(host);
        debugTerminalLifecycle("bootstrapping terminal without measured host size fallback", {
          mountSessionId,
          hostWidth: hostSize.width,
          hostHeight: hostSize.height,
        });
      }
      await ensurePty(mountSessionId);
      if (!canControlTerminal(mountSessionId)) return;
      requestAnimationFrame(() => {
        if (!canControlTerminal(mountSessionId)) return;
        const hostSize = getElementSize(host);
        const rootSize = getElementSize(root);
        debugTerminalLifecycle("running post-ready resize sync on animation frame", {
          mountSessionId,
          hostWidth: hostSize.width,
          hostHeight: hostSize.height,
          rootWidth: rootSize.width,
          rootHeight: rootSize.height,
        });
        scheduleResizeSync();
      });
    };

    resizeObserver = new ResizeObserver(() => {
      if (!canControlTerminal(mountSessionId)) return;
      if (bootstrappedMountSessionId !== mountSessionId) {
        void bootstrapReadyMount();
        return;
      }
      scheduleResizeSync();
    });
    resizeObserver.observe(host);

    await bootstrapReadyMount();
    if (!hasUsableHostSize(host) && bootstrappedMountSessionId !== mountSessionId) {
      queueMicrotask(() => {
        if (!canControlTerminal(mountSessionId)) return;
        if (bootstrappedMountSessionId === mountSessionId) return;
        void bootstrapReadyMount("fallback");
      });
    }
  };

  const handleTerminalData = (data: string) => {
    if (!isTerminalOwner()) return;
    if (!connection || connection.socket.readyState !== WebSocket.OPEN) {
      pendingInputBuffer += data;
      return;
    }

    connection.send(data);
  };

  const handleTerminalResize = (next: { cols: number; rows: number }, sourceTerm?: TGhosttyTerminalInstance | null) => {
    if (!isTerminalOwner()) {
      debugTerminalLifecycle("ignored terminal resize because logic instance is not owner", {
        rows: next.rows,
        cols: next.cols,
      });
      return;
    }
    if (sourceTerm && sourceTerm !== term) {
      debugTerminalLifecycle("ignored terminal resize from stale terminal instance", {
        rows: next.rows,
        cols: next.cols,
      });
      return;
    }

    if (sourceTerm && suppressedResizeSourceTerm === sourceTerm) {
      suppressedResizeSourceTerm = null;
      setSize({ cols: next.cols, rows: next.rows });
      debugTerminalLifecycle("accepted terminal resize without side effects", {
        rows: next.rows,
        cols: next.cols,
        reason: "controlled-programmatic-resize",
      });
      return;
    }

    setSize({ cols: next.cols, rows: next.rows });
    debugTerminalLifecycle("terminal emitted resize", {
      rows: next.rows,
      cols: next.cols,
    });
    persistState();
    pushSizeToBackend(next.rows, next.cols);
  };

  const handleTerminalCleanup = (sourceTerm?: TGhosttyTerminalInstance | null) => {
    if (!isTerminalOwner()) {
      debugTerminalLifecycle("ignored cleanup because logic instance is not owner", {
        ptyID: pty()?.id ?? null,
      });
      return;
    }
    if (sourceTerm && term && sourceTerm !== term) {
      debugTerminalLifecycle("ignored cleanup from stale terminal instance", {
        ptyID: pty()?.id ?? null,
      });
      return;
    }
    debugTerminalLifecycle("cleaning up terminal frontend", {
      ptyID: pty()?.id ?? null,
      status: status(),
    });
    persistState();
    closeConnection();
    resetMountTimersAndObservers();
    term = null;
    terminalRootRef = undefined;
    terminalHostRef = undefined;
    suppressedResizeSourceTerm = null;
    activeMountSessionId += 1;
    bootstrappedMountSessionId = 0;
    releaseTerminalOwnership();
  };

  return {
    status,
    errorMessage,
    terminalTitle,
    removeTerminal,
    restartFrontend,
    handleTerminalReady,
    handleTerminalData,
    handleTerminalResize,
    handleTerminalCleanup,
  };
}
