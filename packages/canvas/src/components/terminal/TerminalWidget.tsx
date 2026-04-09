import type { TOrpcSafeClient } from "@vibecanvas/orpc-client";
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
    ? "flex h-full w-full flex-col border border-border bg-background font-mono text-sm"
    : "flex h-full w-full flex-col bg-[#111214] font-mono text-sm";

  return (
    <div
      ref={rootRef}
      data-terminal-widget-root="true"
      data-hosted-widget-focus-root="true"
      tabIndex={-1}
      class={rootClass}
      style={{ "min-width": "0", "min-height": "0" }}
      onFocusIn={(event) => {
        if (event.currentTarget !== event.target) return;
        clearFocusRetryTimers();
        focusTerminalInputSurface();
      }}
    >
      {props.showChrome !== false && terminalLogic ? (
        <div class="flex items-center justify-between border-b border-border bg-muted px-2 py-1 text-xs">
          <div class="truncate">{terminalLogic.terminalTitle()}</div>
          <div class="flex items-center gap-2 text-muted-foreground">
            <span>{terminalLogic.status()}</span>
            <button
              class="inline-flex h-5 w-5 items-center justify-center border border-border hover:bg-background"
              onClick={() => {
                void terminalLogic.restartFrontend().then(() => setMountRevision((value) => value + 1));
              }}
              title="Reload terminal"
              aria-label="Reload terminal"
            >
              <RefreshCw size={11} />
            </button>
            <button
              class="border border-border px-1 py-0.5 text-[10px] hover:bg-background"
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
              class="h-full w-full min-w-0 flex-1 overflow-hidden bg-[#111214]"
              onReady={terminalLogic.handleTerminalReady}
              onData={terminalLogic.handleTerminalData}
              onResize={terminalLogic.handleTerminalResize}
              onCleanup={terminalLogic.handleTerminalCleanup}
            />
          </>
        </Show>
      ) : (
        <div class="flex h-full w-full flex-1 items-center justify-center bg-[#111214] px-3 text-center text-xs text-red-200">
          Terminal transport is not configured for this host.
        </div>
      )}

      {terminalLogic?.errorMessage() ? (
        <div class="border-t border-border px-2 py-1 text-xs text-destructive">{terminalLogic.errorMessage()}</div>
      ) : null}
    </div>
  );
}
