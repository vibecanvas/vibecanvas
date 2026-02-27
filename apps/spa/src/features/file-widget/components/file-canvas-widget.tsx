import FileIcon from "lucide-solid/icons/file";
import type { Accessor } from "solid-js";

type TFileBounds = {
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
  scale: number;
};

type TFileCanvasWidgetProps = {
  elementId: string;
  path: string;
  renderer: 'pdf' | 'image' | 'text' | 'code' | 'markdown' | 'audio' | 'video' | 'unknown';
  bounds: Accessor<TFileBounds>;
  onPointerDown: (event: PointerEvent) => void;
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
  onRemove: () => void;
};

export function FileCanvasWidget(props: TFileCanvasWidgetProps) {
  const filename = () => props.path.split('/').pop() ?? props.path;

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
        <div class="flex items-center gap-2 flex-1 truncate">
          <span class="font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">
            {props.renderer}
          </span>
          <span class="truncate">{filename()}</span>
        </div>
        <button
          class="border border-border px-1 py-0.5 text-[10px] hover:bg-background shrink-0"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            props.onRemove();
          }}
          title="Remove file"
        >
          CLOSE
        </button>
      </div>

      <div class="flex-1 flex items-center justify-center p-4">
        <div class="flex flex-col items-center gap-3 text-center">
          <FileIcon size={48} class="text-muted-foreground" />
          <div class="text-muted-foreground text-xs font-mono truncate max-w-full">
            {props.path}
          </div>
          <div class="text-muted-foreground text-[10px] uppercase tracking-wide">
            {props.renderer}
          </div>
        </div>
      </div>
    </div>
  );
}