import AlertTriangle from "lucide-solid/icons/alert-triangle";
import ImageIcon from "lucide-solid/icons/image";
import { Show, createSignal, onMount } from "solid-js";

type TImageViewerProps = {
  src: string | null;
  path: string;
  isDeleted: boolean;
};

export function ImageViewer(props: TImageViewerProps) {
  const [imageLoading, setImageLoading] = createSignal(true);
  const [imageError, setImageError] = createSignal(false);

  onMount(() => {
    setImageLoading(true);
    setImageError(false);
  });

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  return (
    <div class="flex-1 flex items-center justify-center p-2 overflow-hidden bg-muted/20">
      <Show when={props.isDeleted}>
        <div class="flex flex-col items-center gap-3 text-center">
          <AlertTriangle size={48} class="text-destructive" />
          <div class="font-mono text-xs text-destructive">File deleted</div>
          <div class="max-w-full truncate font-mono text-xs text-muted-foreground">{props.path}</div>
        </div>
      </Show>

      <Show when={!props.isDeleted}>
        <Show when={!props.src}>
          <div class="flex flex-col items-center gap-3 text-center">
            <ImageIcon size={48} class="text-muted-foreground" />
            <div class="font-mono text-xs text-muted-foreground">No image data</div>
          </div>
        </Show>

        <Show when={props.src}>
          <div class="relative w-full h-full flex items-center justify-center">
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
              class="max-w-full max-h-full object-contain"
              style={{ "image-rendering": "auto" }}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </div>
        </Show>
      </Show>
    </div>
  );
}
