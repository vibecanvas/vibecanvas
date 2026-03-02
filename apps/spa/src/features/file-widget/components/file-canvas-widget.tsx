import { orpcWebsocketService } from "@/services/orpc-websocket";
import { useFileContent } from "../hooks/use-file-content";
import { CodeEditor } from "./viewers/code-editor";
import { ImageViewer } from "./viewers/image-viewer";
import { PDFViewer } from "./viewers/pdf-viewer";
import { PlaceholderViewer } from "./viewers/placeholder-viewer";
import { type Accessor, createSignal, createMemo, createResource, Match, onCleanup, onMount, Show, Switch } from "solid-js";

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
  const [hasConflict, setHasConflict] = createSignal(false);

  // Determine content type based on renderer
  const contentType = createMemo(() => {
    if (props.renderer === "image") return "base64" as const;
    if (props.renderer === "pdf") return "arraybuffer" as const;
    return "text" as const;
  });

  const { content, loading, error, dirty, saving, setDirty, refetch, save } = useFileContent(() => props.path);

  // Fetch inspect data for binary files
  const [inspectData] = createResource(
    () => (props.renderer === "pdf" || props.renderer === "audio" || props.renderer === "video" || props.renderer === "unknown") ? props.path : null,
    async (path) => {
      if (!path) return null;
      const [err, result] = await orpcWebsocketService.safeClient.api.filesystem.inspect({ query: { path } });
      if (err || !result || "type" in result) return null;
      return result;
    }
  );

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
        } else if (event.eventType === 'change') {
          if (dirty()) {
            setHasConflict(true);
          } else {
            setHasConflict(false);
            setIsDeleted(false);
            void refetch({ background: true, contentType: contentType() });
          }
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
    void refetch({ contentType: contentType() });
    void startWatching();
  });

  onCleanup(() => {
    stopWatching();
  });

  const saveContent = async (nextContent: string) => {
    const didSave = await save(nextContent);
    if (didSave) {
      setHasConflict(false);
    }
  };

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
          <Show when={dirty()}>
            <span class="font-semibold text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400">dirty</span>
          </Show>
          <Show when={saving()}>
            <span class="font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">saving</span>
          </Show>
          <Show when={hasConflict()}>
            <span class="font-semibold text-[10px] uppercase tracking-wide text-destructive">conflict</span>
          </Show>
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

      <Switch fallback={
        <PlaceholderViewer 
          path={props.path} 
          renderer={props.renderer} 
          isDeleted={isDeleted()} 
          size={content()?.kind === "binary" ? (content() as { kind: "binary"; size: number }).size : undefined}
          permissions={inspectData()?.permissions}
          mimeType={inspectData()?.mime ?? undefined}
          lastModified={inspectData()?.lastModified}
        />
      }>
        <Match when={loading()}>
          <div class="flex-1 flex items-center justify-center">
            <span class="font-mono text-xs text-muted-foreground">Loading...</span>
          </div>
        </Match>

        <Match when={error()}>
          {(message) => (
            <div class="flex-1 flex items-center justify-center p-4">
              <span class="break-all font-mono text-xs text-destructive">{message()}</span>
            </div>
          )}
        </Match>

        <Match when={(props.renderer === "code" || props.renderer === "markdown" || props.renderer === "text") && content()?.kind === "text"}>
          <CodeEditor
            content={(content() as { kind: "text"; content: string; truncated: boolean }).content}
            path={props.path}
            truncated={(content() as { kind: "text"; content: string; truncated: boolean }).truncated}
            onSave={saveContent}
            onDirty={setDirty}
          />
        </Match>

        <Match when={props.renderer === "image" && content()?.kind === "binary"}>
          <ImageViewer
            src={(content() as { kind: "binary"; content: string | null }).content}
            path={props.path}
            isDeleted={isDeleted()}
          />
        </Match>

        <Match when={props.renderer === "pdf" && content()?.kind === "binary"}>
          <PDFViewer
            src={(content() as { kind: "binary"; content: string | null }).content}
            path={props.path}
            isDeleted={isDeleted()}
          />
        </Match>
      </Switch>
    </div>
  );
}
