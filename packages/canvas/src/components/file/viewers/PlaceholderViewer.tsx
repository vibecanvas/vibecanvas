import AlertTriangle from "lucide-solid/icons/alert-triangle";
import "./shared.css";
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
    <div class="vc-viewer-state">
      <Show when={!props.isDeleted} fallback={
        <div class="vc-viewer-state vc-viewer-state--danger">
          <AlertTriangle size={48} class="vc-viewer-state-icon--danger" />
          <div class="vc-viewer-state-message">File deleted</div>
        </div>
      }>
        <div class="vc-viewer-state">
          <FileIconComponent size={48} class="vc-viewer-state-icon--muted" />
          <div class="vc-viewer-path">{props.path}</div>
          <div class="vc-viewer-label">Binary File</div>

          <Show when={props.size !== undefined || props.permissions || props.mimeType}>
            <div class="vc-viewer-meta-card">
              <div class="vc-viewer-meta">
                <Show when={props.size !== undefined}>
                  <div class="vc-viewer-meta-row">
                    <span>Size:</span>
                    <span>{formatFileSize(props.size!)}</span>
                  </div>
                </Show>
                <Show when={props.mimeType}>
                  <div class="vc-viewer-meta-row">
                    <span>Type:</span>
                    <span class="vc-viewer-meta-value--truncate" title={props.mimeType!}>{props.mimeType}</span>
                  </div>
                </Show>
                <Show when={props.lastModified}>
                  <div class="vc-viewer-meta-row">
                    <span>Modified:</span>
                    <span>{formatDate(props.lastModified!)}</span>
                  </div>
                </Show>
                <Show when={props.permissions}>
                  <div class="vc-viewer-meta-row">
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
