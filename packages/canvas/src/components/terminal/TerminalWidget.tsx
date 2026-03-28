import { onCleanup } from "solid-js";
import type { TTerminalSafeClient } from "../../services/canvas/interface";
import { GhosttyTerminalMount } from "./GhosttyTerminalMount";
import { createTerminalContextLogic } from "./createTerminalContextLogic";

type TTerminalWidgetProps = {
  terminalKey: string;
  workingDirectory: string;
  title?: string;
  showChrome?: boolean;
  safeClient?: TTerminalSafeClient;
  registerBeforeRemove?: (handler: (() => void | Promise<void>) | null) => void;
};

export function TerminalWidget(props: TTerminalWidgetProps) {
  const terminalLogic = props.safeClient
    ? createTerminalContextLogic({
      terminalKey: props.terminalKey,
      workingDirectory: props.workingDirectory,
      title: props.title,
      safeClient: props.safeClient,
    })
    : null;

  if (terminalLogic) {
    props.registerBeforeRemove?.(() => terminalLogic.removeTerminal());
    onCleanup(() => {
      props.registerBeforeRemove?.(null);
    });
  }

  const rootClass = props.showChrome !== false
    ? "flex h-full w-full flex-col border border-border bg-background font-mono text-sm"
    : "flex h-full w-full flex-col bg-[#111214] font-mono text-sm";

  return (
    <div class={rootClass}>
      {props.showChrome !== false && terminalLogic ? (
        <div class="flex items-center justify-between border-b border-border bg-muted px-2 py-1 text-xs">
          <div class="truncate">{terminalLogic.terminalTitle()}</div>
          <div class="flex items-center gap-2 text-muted-foreground">
            <span>{terminalLogic.status()}</span>
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
        <GhosttyTerminalMount
          class="h-full w-full flex-1 overflow-hidden bg-[#111214]"
          onReady={terminalLogic.handleTerminalReady}
          onData={terminalLogic.handleTerminalData}
          onResize={terminalLogic.handleTerminalResize}
          onCleanup={terminalLogic.handleTerminalCleanup}
        />
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
