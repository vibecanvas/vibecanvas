import { createTerminalContextLogic } from "@/features/terminal/context/terminal.context";

type TTerminalWidgetProps = {
  terminalKey: string;
  workingDirectory: string;
  title?: string;
  showChrome?: boolean;
};

export function TerminalWidget(props: TTerminalWidgetProps) {
  const terminalLogic = createTerminalContextLogic(props);

  return (
    <div class="flex h-full w-full flex-col border border-border bg-background font-mono text-sm" ref={terminalLogic.setResizeHostRef}>
      {props.showChrome !== false ? (
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

      <div ref={terminalLogic.setTerminalRootRef} class="h-full w-full flex-1 overflow-hidden bg-[#111214]" />

      {terminalLogic.errorMessage() ? (
        <div class="border-t border-border px-2 py-1 text-xs text-destructive">{terminalLogic.errorMessage()}</div>
      ) : null}
    </div>
  );
}
