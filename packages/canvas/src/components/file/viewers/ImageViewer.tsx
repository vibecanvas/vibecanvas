import AlertTriangle from "lucide-solid/icons/alert-triangle";
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
    <div class="flex flex-1 items-center justify-center overflow-hidden bg-muted/20 p-2">
      <Show when={props.isDeleted} fallback={
        <Show when={!props.src} fallback={
          <div class="relative flex h-full w-full items-center justify-center">
            <Show when={imageLoading()}>
              <div class="absolute inset-0 flex items-center justify-center bg-muted/20">
                <div class="font-mono text-xs text-muted-foreground">Loading...</div>
              </div>
            </Show>
            <Show when={imageError()}>
              <div class="flex flex-col items-center gap-3 text-center">
                <AlertTriangle size={48} class="text-destructive" />
                <div class="font-mono text-xs text-destructive">Failed to load image</div>
              </div>
            </Show>
            <img
              src={props.src!}
              alt={props.path.split("/").pop() ?? "Image"}
              class="max-h-full max-w-full object-contain"
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
          <div class="flex flex-col items-center gap-3 text-center">
            <ImageIcon size={48} class="text-muted-foreground" />
            <div class="font-mono text-xs text-muted-foreground">No image data</div>
          </div>
        </Show>
      }>
        <div class="flex flex-col items-center gap-3 text-center">
          <AlertTriangle size={48} class="text-destructive" />
          <div class="font-mono text-xs text-destructive">File deleted</div>
          <div class="max-w-full truncate font-mono text-xs text-muted-foreground">{props.path}</div>
        </div>
      </Show>
    </div>
  );
}
