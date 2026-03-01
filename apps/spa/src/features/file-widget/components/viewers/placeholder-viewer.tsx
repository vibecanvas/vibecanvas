import AlertTriangle from "lucide-solid/icons/alert-triangle";
import FileIcon from "lucide-solid/icons/file";
import { Show } from "solid-js";

type TPlaceholderViewerProps = {
  path: string;
  renderer: "pdf" | "image" | "text" | "code" | "markdown" | "audio" | "video" | "unknown";
  isDeleted: boolean;
};

export function PlaceholderViewer(props: TPlaceholderViewerProps) {
  return (
    <div class="flex-1 flex items-center justify-center p-4">
      <div class="flex flex-col items-center gap-3 text-center">
        <Show when={props.isDeleted} fallback={<FileIcon size={48} class="text-muted-foreground" />}>
          <AlertTriangle size={48} class="text-destructive" />
          <div class="font-mono text-xs text-destructive">File deleted</div>
        </Show>
        <div class="max-w-full truncate font-mono text-xs text-muted-foreground">{props.path}</div>
        <Show when={!props.isDeleted}>
          <div class="text-[10px] uppercase tracking-wide text-muted-foreground">{props.renderer}</div>
        </Show>
      </div>
    </div>
  );
}
