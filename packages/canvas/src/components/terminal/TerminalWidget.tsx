import type { TPtyImageFormat, TOrpcSafeClient } from "@vibecanvas/orpc-client";
import "./TerminalWidget.css";
import RefreshCw from "lucide-solid/icons/refresh-cw";
import { createEffect, onCleanup, Show, createSignal } from "solid-js";
import type { THostedWidgetChrome } from "../../services/canvas/interface";
import { GhosttyTerminalMount } from "./GhosttyTerminalMount";
import { createTerminalContextLogic } from "./createTerminalContextLogic";

type TTerminalWidgetProps = {
  terminalKey: string;
  workingDirectory: string;
  title?: string;
  showChrome?: boolean;
  apiService?: TOrpcSafeClient;
  setWindowChrome?: (chrome: THostedWidgetChrome | null) => void;
  registerBeforeRemove?: (handler: (() => void | Promise<void>) | null) => void;
  registerReload?: (handler: (() => void | Promise<void>) | null) => void;
  registerFocus?: (handler: (() => void) | null) => void;
  registerInsertText?: (handler: ((text: string) => void) | null) => void;
};

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Failed to read clipboard image"));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read clipboard image"));
    };
    reader.readAsDataURL(file);
  });
}

function toPtyImageFormat(type: string): TPtyImageFormat | null {
  if (type === "image/jpeg") return type;
  if (type === "image/png") return type;
  if (type === "image/gif") return type;
  if (type === "image/webp") return type;
  return null;
}

export function TerminalWidget(props: TTerminalWidgetProps) {
  const [mountRevision, setMountRevision] = createSignal(1);
  let rootRef: HTMLDivElement | undefined;
  const focusRetryTimerIds: number[] = [];
  const terminalLogic = props.apiService
    ? createTerminalContextLogic({
      terminalKey: props.terminalKey,
      workingDirectory: props.workingDirectory,
      title: props.title,
      apiService: props.apiService,
    })
    : null;

  if (terminalLogic) {
    props.registerBeforeRemove?.(() => terminalLogic.removeTerminal());
    props.registerReload?.(() => terminalLogic.restartFrontend().then(() => {
      setMountRevision((value) => value + 1);
    }));
    props.registerFocus?.(() => {
      clearFocusRetryTimers();
      rootRef?.focus({ preventScroll: true });
      focusTerminalInputSurface();
    });
    props.registerInsertText?.((text) => {
      focusTerminalInputSurface();
      terminalLogic.handleTerminalData(text);
    });
  }

  const clearFocusRetryTimers = () => {
    focusRetryTimerIds.splice(0).forEach((timerId) => window.clearTimeout(timerId));
  };

  const uploadClipboardImage = async (file: File | Blob) => {
    if (!props.apiService) {
      throw new Error("Terminal transport is not configured for this host.");
    }

    const format = toPtyImageFormat(file.type);
    if (!format) {
      throw new Error(`Unsupported clipboard image type: ${file.type || "unknown"}`);
    }

    const base64 = await fileToDataUrl(file);
    const [error, result] = await props.apiService.api.pty.uploadImage({
      workingDirectory: props.workingDirectory,
      body: {
        base64,
        format,
      },
    });

    if (error || !result?.path) {
      throw new Error(error instanceof Error ? error.message : "Failed to upload clipboard image");
    }

    return result.path;
  };

  const focusTerminalInputSurface = (attempt = 0) => {
    if (!rootRef || !rootRef.isConnected) return;

    const textarea = rootRef.querySelector<HTMLElement>("[data-ghostty-terminal-textarea='true'], textarea");
    if (textarea) {
      textarea.focus({ preventScroll: true });
      return;
    }

    if (attempt >= 4) return;
    const timeoutId = window.setTimeout(() => {
      focusTerminalInputSurface(attempt + 1);
    }, attempt === 0 ? 0 : 16);
    focusRetryTimerIds.push(timeoutId);
  };

  onCleanup(() => {
    clearFocusRetryTimers();
    props.setWindowChrome?.(null);
    props.registerBeforeRemove?.(null);
    props.registerReload?.(null);
    props.registerFocus?.(null);
    props.registerInsertText?.(null);
  });

  createEffect(() => {
    if (!terminalLogic) {
      props.setWindowChrome?.({ title: props.title ?? "terminal" });
      return;
    }

    props.setWindowChrome?.({
      title: terminalLogic.terminalTitle(),
      subtitle: terminalLogic.status(),
    });
  });

  const rootClass = props.showChrome !== false
    ? "vc-terminal-widget vc-terminal-widget--chrome"
    : "vc-terminal-widget vc-terminal-widget--bare";

  return (
    <div
      ref={rootRef}
      data-terminal-widget-root="true"
      data-hosted-widget-focus-root="true"
      tabIndex={-1}
      class={rootClass}
      style={{
        "min-width": "0",
        "min-height": "0",
        background: props.showChrome !== false ? undefined : "var(--vc-terminal-background, #111214)",
        color: props.showChrome !== false ? undefined : "var(--vc-terminal-foreground, #e5e7eb)",
      }}
      onFocusIn={(event) => {
        if (event.currentTarget !== event.target) return;
        clearFocusRetryTimers();
        focusTerminalInputSurface();
      }}
    >
      {props.showChrome !== false && terminalLogic ? (
        <div class="vc-terminal-header">
          <div class="vc-terminal-title">{terminalLogic.terminalTitle()}</div>
          <div class="vc-terminal-status">
            <span>{terminalLogic.status()}</span>
            <button
              class="vc-terminal-icon-button"
              onClick={() => {
                void terminalLogic.restartFrontend().then(() => setMountRevision((value) => value + 1));
              }}
              title="Reload terminal"
              aria-label="Reload terminal"
            >
              <RefreshCw size={11} />
            </button>
            <button
              class="vc-terminal-close-button"
              onClick={() => {
                void terminalLogic.removeTerminal();
              }}
            >
              CLOSE
            </button>
          </div>
        </div>
      ) : null}

      {terminalLogic ? (
        <Show when={mountRevision()} keyed>
          <>
            <GhosttyTerminalMount
              class="vc-terminal-mount"
              style={{ background: "var(--vc-terminal-background, #111214)" }}
              onReady={terminalLogic.handleTerminalReady}
              onData={terminalLogic.handleTerminalData}
              onResize={terminalLogic.handleTerminalResize}
              onCleanup={terminalLogic.handleTerminalCleanup}
              onUploadClipboardImage={uploadClipboardImage}
            />
          </>
        </Show>
      ) : (
        <div class="vc-terminal-unavailable"
          style={{ background: "var(--vc-terminal-background, #111214)", color: "var(--vc-terminal-error-foreground, #fecaca)" }}
        >
          Terminal transport is not configured for this host.
        </div>
      )}

      {terminalLogic?.errorMessage() ? (
        <div class="vc-terminal-error">{terminalLogic.errorMessage()}</div>
      ) : null}
    </div>
  );
}
