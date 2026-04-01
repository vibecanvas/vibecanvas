import AlertTriangle from "lucide-solid/icons/alert-triangle";
import FileArchive from "lucide-solid/icons/file-archive";
import FileAudio from "lucide-solid/icons/file-audio";
import FileIcon from "lucide-solid/icons/file";
import FileImage from "lucide-solid/icons/file-image";
import FileVideo from "lucide-solid/icons/file-video";
import { Show } from "solid-js";

type TPlaceholderViewerProps = {
  path: string;
  renderer: "pdf" | "image" | "text" | "code" | "markdown" | "audio" | "video" | "unknown";
  isDeleted: boolean;
  size?: number;
  permissions?: string;
  mimeType?: string;
  lastModified?: number;
};

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getFileIcon(renderer: string) {
  switch (renderer) {
    case "pdf":
      return FileArchive;
    case "image":
      return FileImage;
    case "audio":
      return FileAudio;
    case "video":
      return FileVideo;
    default:
      return FileIcon;
  }
}

export function PlaceholderViewer(props: TPlaceholderViewerProps) {
  const FileIconComponent = getFileIcon(props.renderer);

  return (
    <div class="flex flex-1 items-center justify-center p-4">
      <Show when={!props.isDeleted} fallback={
        <div class="flex flex-col items-center gap-3 text-center">
          <AlertTriangle size={48} class="text-destructive" />
          <div class="font-mono text-xs text-destructive">File deleted</div>
        </div>
      }>
        <div class="flex flex-col items-center gap-3 text-center">
          <FileIconComponent size={48} class="text-muted-foreground" />
          <div class="font-mono text-xs text-muted-foreground">{props.path}</div>
          <div class="text-[10px] uppercase tracking-wide text-muted-foreground">Binary File</div>

          <Show when={props.size !== undefined || props.permissions || props.mimeType}>
            <div class="mt-2 w-full max-w-[220px] border-t border-border pt-2">
              <div class="flex flex-col gap-1 font-mono text-[10px] text-muted-foreground">
                <Show when={props.size !== undefined}>
                  <div class="flex justify-between">
                    <span>Size:</span>
                    <span>{formatFileSize(props.size!)}</span>
                  </div>
                </Show>
                <Show when={props.mimeType}>
                  <div class="flex justify-between gap-3">
                    <span>Type:</span>
                    <span class="max-w-[120px] truncate" title={props.mimeType!}>{props.mimeType}</span>
                  </div>
                </Show>
                <Show when={props.lastModified}>
                  <div class="flex justify-between">
                    <span>Modified:</span>
                    <span>{formatDate(props.lastModified!)}</span>
                  </div>
                </Show>
                <Show when={props.permissions}>
                  <div class="flex justify-between">
                    <span>Permissions:</span>
                    <span>{props.permissions}</span>
                  </div>
                </Show>
              </div>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
