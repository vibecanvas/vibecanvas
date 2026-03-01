import { orpcWebsocketService } from "@/services/orpc-websocket";
import FileIcon from "lucide-solid/icons/file";
import AlertTriangle from "lucide-solid/icons/alert-triangle";
import { type Accessor, createSignal, onCleanup, onMount, Show } from "solid-js";

const WATCH_KEEPALIVE_INTERVAL_MS = 10_000;

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
  const [isDeleted, setIsDeleted] = createSignal(false);

  let watchAbort: AbortController | null = null;
  let activeWatchId: string | null = null;
  let keepaliveInterval: ReturnType<typeof setInterval> | null = null;

  const clearKeepaliveInterval = () => {
    if (!keepaliveInterval) return;
    clearInterval(keepaliveInterval);
    keepaliveInterval = null;
  };

  const stopWatching = () => {
    const watchId = activeWatchId;
    activeWatchId = null;
    clearKeepaliveInterval();
    watchAbort?.abort();
    watchAbort = null;

    if (!watchId) return;
    void orpcWebsocketService.safeClient.api.filesystem.unwatch({ watchId });
  };

  const startWatching = async () => {
    stopWatching();

    const abort = new AbortController();
    const watchId = crypto.randomUUID();
    watchAbort = abort;
    activeWatchId = watchId;

    const [err, iterator] = await orpcWebsocketService.safeClient.api.filesystem.watch(
      { path: props.path, watchId },
      { signal: abort.signal },
    );
    if (err || !iterator || abort.signal.aborted) {
      if (activeWatchId === watchId) {
        activeWatchId = null;
        watchAbort = null;
        clearKeepaliveInterval();
      }
      return;
    }

    keepaliveInterval = setInterval(async () => {
      if (activeWatchId !== watchId || abort.signal.aborted) return;
      const [keepaliveError, keepaliveResult] = await orpcWebsocketService.safeClient.api.filesystem.keepaliveWatch({ watchId });
      if (keepaliveError || !keepaliveResult) {
        if (activeWatchId === watchId) {
          stopWatching();
        }
      }
    }, WATCH_KEEPALIVE_INTERVAL_MS);

    try {
      for await (const event of iterator) {
        if (abort.signal.aborted || activeWatchId !== watchId) break;
        if (event.eventType === 'rename') {
          setIsDeleted(true);
        }
      }
    } catch {
      // stream ended or aborted
    } finally {
      if (activeWatchId === watchId) {
        activeWatchId = null;
        watchAbort = null;
        clearKeepaliveInterval();
        void orpcWebsocketService.safeClient.api.filesystem.unwatch({ watchId });
      }
    }
  };

  onMount(() => {
    void startWatching();
  });

  onCleanup(() => {
    stopWatching();
  });

  return (
    <div
      class="absolute pointer-events-auto flex flex-col border border-border bg-card text-card-foreground"
      classList={{ "opacity-60": isDeleted() }}
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
          <Show when={isDeleted()} fallback={<FileIcon size={48} class="text-muted-foreground" />}>
            <AlertTriangle size={48} class="text-destructive" />
            <div class="text-destructive text-xs font-mono">File deleted</div>
          </Show>
          <div class="text-muted-foreground text-xs font-mono truncate max-w-full">
            {props.path}
          </div>
          <Show when={!isDeleted()}>
            <div class="text-muted-foreground text-[10px] uppercase tracking-wide">
              {props.renderer}
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
}
