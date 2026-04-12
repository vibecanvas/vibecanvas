import AlertTriangle from "lucide-solid/icons/alert-triangle";
import "./shared.css";
import "./ImageViewer.css";
import ImageIcon from "lucide-solid/icons/image";
import { Show, createSignal, onMount } from "solid-js";

type TImageViewerProps = {
  src: string | null;
  path: string;
  isDeleted: boolean;
  onContentReady?: (size: { width: number; height: number }) => void;
};

export function ImageViewer(props: TImageViewerProps) {
  const [imageLoading, setImageLoading] = createSignal(true);
  const [imageError, setImageError] = createSignal(false);

  onMount(() => {
    setImageLoading(true);
    setImageError(false);
  });

  return (
    <div class="vc-image-viewer">
      <Show when={props.isDeleted} fallback={
        <Show when={!props.src} fallback={
          <div class="vc-image-stage">
            <Show when={imageLoading()}>
              <div class="vc-image-loading-overlay">
                <div class="vc-viewer-state-message">Loading...</div>
              </div>
            </Show>
            <Show when={imageError()}>
              <div class="vc-viewer-state vc-viewer-state--danger">
                <AlertTriangle size={48} class="vc-viewer-state-icon--danger" />
                <div class="vc-viewer-state-message">Failed to load image</div>
              </div>
            </Show>
            <img
              src={props.src!}
              alt={props.path.split("/").pop() ?? "Image"}
              class="vc-image-element"
              onLoad={(event) => {
                setImageLoading(false);
                setImageError(false);
                props.onContentReady?.({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                });
              }}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
          </div>
        }>
          <div class="vc-viewer-state">
            <ImageIcon size={48} class="vc-viewer-state-icon--muted" />
            <div class="vc-viewer-state-message">No image data</div>
          </div>
        </Show>
      }>
        <div class="vc-viewer-state vc-viewer-state--danger">
          <AlertTriangle size={48} class="vc-viewer-state-icon--danger" />
          <div class="vc-viewer-state-message">File deleted</div>
          <div class="vc-viewer-path">{props.path}</div>
        </div>
      </Show>
    </div>
  );
}
