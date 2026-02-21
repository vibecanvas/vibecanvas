import FolderTree from "lucide-solid/icons/folder-tree";
import Minus from "lucide-solid/icons/minus";
import Trash2 from "lucide-solid/icons/trash-2";

type TFiletreeHeaderProps = {
  title: string;
  subtitle: string;
  onPointerDown: (event: PointerEvent) => void;
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
  onCollapse: () => void;
  onRemove: () => void;
};

export function FiletreeHeader(props: TFiletreeHeaderProps) {
  return (
    <div
      class="h-8 px-2 border-b border-border bg-card flex items-center justify-between cursor-grab active:cursor-grabbing"
      onPointerDown={props.onPointerDown}
      onPointerMove={props.onPointerMove}
      onPointerUp={props.onPointerUp}
    >
      <div class="flex items-center gap-1.5 min-w-0">
        <FolderTree size={13} class="text-foreground shrink-0" />
        <span class="text-xs font-mono text-foreground truncate">{props.title}</span>
        <span class="text-[10px] text-muted-foreground truncate">{props.subtitle}</span>
      </div>

      <div class="flex items-center gap-1">
        <button
          type="button"
          class="w-5 h-5 border border-border bg-secondary text-secondary-foreground hover:bg-accent inline-flex items-center justify-center"
          onClick={props.onCollapse}
          title="Collapse"
        >
          <Minus size={12} />
        </button>
        <button
          type="button"
          class="w-5 h-5 border border-border bg-secondary text-secondary-foreground hover:bg-destructive hover:text-destructive-foreground inline-flex items-center justify-center"
          onClick={props.onRemove}
          title="Remove"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
