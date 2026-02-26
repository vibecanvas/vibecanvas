import { Terminal } from "@/components/terminal";
import type { Accessor } from "solid-js";

type TTerminalBounds = {
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
  scale: number;
};

type TTerminalWidgetProps = {
  title?: string;
  terminalKey: string;
  workingDirectory: string;
  bounds: Accessor<TTerminalBounds>;
  onPointerDown: (event: PointerEvent) => void;
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
  onRemove: () => void;
};

export function TerminalWidget(props: TTerminalWidgetProps) {
  return (
    <div
      class="absolute pointer-events-auto flex flex-col border border-border bg-card text-card-foreground"
      style={{
        left: `${props.bounds().x}px`,
        top: `${props.bounds().y}px`,
        width: `${props.bounds().w}px`,
        height: `${props.bounds().h}px`,
        transform: `translate(-50%, -50%) rotate(${props.bounds().angle}rad) scale(${props.bounds().scale})`,
        "transform-origin": "center",
      }}
    >
      <div
        class="flex h-8 items-center justify-between border-b border-border bg-muted px-2 font-mono text-xs cursor-grab active:cursor-grabbing"
        onPointerDown={props.onPointerDown}
        onPointerMove={props.onPointerMove}
        onPointerUp={props.onPointerUp}
      >
        <span class="truncate">{props.title ?? "Terminal"}</span>
        <button
          class="border border-border px-1 py-0.5 text-[10px] hover:bg-background"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            props.onRemove();
          }}
          title="Remove terminal"
        >
          CLOSE
        </button>
      </div>

      <div class="min-h-0 flex-1">
        <Terminal
          terminalKey={props.terminalKey}
          workingDirectory={props.workingDirectory}
          title={props.title ?? "Terminal"}
          showChrome={false}
        />
      </div>
    </div>
  );
}
