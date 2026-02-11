import Minus from "lucide-solid/icons/minus"
import FolderOpen from "lucide-solid/icons/folder-open"
import X from "lucide-solid/icons/x"

type TChatHeaderProps = {
  title: string | undefined
  subtitle?: string | null
  onSetFolder: () => void
  onCollapse: () => void
  onRemove: () => void
  onPointerDown: (e: PointerEvent) => void
  onPointerMove: (e: PointerEvent) => void
  onPointerUp: (e: PointerEvent) => void
}

export function ChatHeader(props: TChatHeaderProps) {
  return (
    <div
      class="flex flex-col gap-1 px-2 py-1.5 bg-muted border-b border-border font-mono cursor-grab active:cursor-grabbing"
      onPointerDown={props.onPointerDown}
      onPointerMove={props.onPointerMove}
      onPointerUp={props.onPointerUp}
    >
      <div class="flex items-center justify-between gap-2">
        <div class="text-sm truncate flex-1 min-w-0">{props.title}</div>
        <div class="flex items-center gap-1 ml-2">
          <button
            class="p-1 hover:bg-background rounded-sm text-muted-foreground hover:text-foreground"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              props.onCollapse()
            }}
            title="Collapse chat"
          >
            <Minus size={14} />
          </button>
          <button
            class="p-1 hover:bg-background rounded-sm text-muted-foreground hover:text-destructive"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              props.onRemove()
            }}
            title="Remove chat"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2 min-w-0">
        <div class="flex items-center gap-1 text-[11px] text-muted-foreground truncate flex-1 min-w-0">
          <FolderOpen size={12} />
          <span class="truncate">{props.subtitle ?? "No folder selected"}</span>
        </div>
        <button
          class="px-1.5 py-0.5 border border-border text-[10px] leading-none text-muted-foreground hover:text-foreground hover:bg-background"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            props.onSetFolder()
          }}
          title="Set chat folder"
        >
          PATH
        </button>
      </div>
    </div>
  )
}
