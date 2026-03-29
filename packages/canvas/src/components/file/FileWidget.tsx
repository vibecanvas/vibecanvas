import { createEffect, createMemo, createResource, createSignal, Match, onCleanup, onMount, Show, Suspense, Switch, lazy } from "solid-js";
import type { TFileSafeClient, THostedWidgetChrome, THostedWidgetElementMap } from "../../services/canvas/interface";
import { getFileName, toDataUrlFromBinaryContent } from "./utils";
import { useFileContent } from "./useFileContent";
import { CodeEditor } from "./viewers/CodeEditor";
import { ImageViewer } from "./viewers/ImageViewer";
import { PlaceholderViewer } from "./viewers/PlaceholderViewer";

const PdfViewer = lazy(async () => import("./viewers/PdfViewer").then((module) => ({ default: module.PdfViewer })));

const WATCH_KEEPALIVE_INTERVAL_MS = 10_000;

type TFileWidgetProps = {
  element: () => THostedWidgetElementMap["file"];
  safeClient: TFileSafeClient;
  setWindowChrome?: (chrome: THostedWidgetChrome | null) => void;
  requestInitialSize?: (size: { width: number; height: number }) => void;
};

export function FileWidget(props: TFileWidgetProps) {
  const path = createMemo(() => props.element().data.path);
  const renderer = createMemo(() => props.element().data.renderer);
  const filename = createMemo(() => getFileName(path()));
  const [inspectData] = createResource(
    () => (["pdf", "audio", "video", "unknown"].includes(renderer()) ? path() : null),
    async (nextPath) => {
      if (!nextPath) return null;
      const [err, result] = await props.safeClient.api.filesystem.inspect({ query: { path: nextPath } });
      if (err || !result || "type" in result) return null;
      return result;
    },
  );
  const { content, loading, error, dirty, saving, setDirty, refetch, save } = useFileContent(props.safeClient, path);

  let watchAbort: AbortController | null = null;
  let activeWatchId: string | null = null;
  let keepaliveInterval: ReturnType<typeof setInterval> | null = null;
  const [isDeleted, setIsDeleted] = createSignal(false);
  const [hasConflict, setHasConflict] = createSignal(false);
  const [didAutoSize, setDidAutoSize] = createSignal(false);

  const contentType = createMemo(() => {
    if (renderer() === "image") return "base64" as const;
    if (renderer() === "pdf") return "base64" as const;
    return "text" as const;
  });
  const shouldAutoSize = createMemo(() => {
    const element = props.element();
    return element.data.w === 560 && element.data.h === 500;
  });
  const windowSubtitle = createMemo(() => [
    renderer(),
    dirty() ? "dirty" : null,
    saving() ? "saving" : null,
    hasConflict() ? "conflict" : null,
  ].filter((value): value is string => Boolean(value)).join(" · "));

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
    void props.safeClient.api.filesystem.unwatch({ watchId });
  };

  const startWatching = async () => {
    stopWatching();

    const abort = new AbortController();
    const watchId = crypto.randomUUID();
    watchAbort = abort;
    activeWatchId = watchId;

    const [err, iterator] = await props.safeClient.api.filesystem.watch({ path: path(), watchId }, { signal: abort.signal });
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
      const [keepaliveError, keepaliveResult] = await props.safeClient.api.filesystem.keepaliveWatch({ watchId });
      if (keepaliveError || !keepaliveResult) {
        if (activeWatchId === watchId) stopWatching();
      }
    }, WATCH_KEEPALIVE_INTERVAL_MS);

    try {
      for await (const event of iterator) {
        if (abort.signal.aborted || activeWatchId !== watchId) break;
        if (event.eventType === "rename") {
          setIsDeleted(true);
        } else if (event.eventType === "change") {
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
      // ignored
    } finally {
      if (activeWatchId === watchId) {
        activeWatchId = null;
        watchAbort = null;
        clearKeepaliveInterval();
        void props.safeClient.api.filesystem.unwatch({ watchId });
      }
    }
  };

  onMount(() => {
    void refetch({ contentType: contentType() });
    void startWatching();
  });

  onCleanup(() => {
    stopWatching();
    props.setWindowChrome?.(null);
  });

  createEffect(() => {
    props.setWindowChrome?.({
      title: filename(),
      subtitle: windowSubtitle(),
    });
  });

  const saveContent = async (nextContent: string) => {
    const didSave = await save(nextContent);
    if (didSave) setHasConflict(false);
  };

  const requestInitialSize = (size: { width: number; height: number }) => {
    if (didAutoSize()) return;
    if (!shouldAutoSize()) return;
    if (!props.requestInitialSize) return;

    props.requestInitialSize({
      width: Math.max(320, Math.round(size.width)),
      height: Math.max(220, Math.round(size.height)),
    });
    setDidAutoSize(true);
  };

  const imageSrc = createMemo(() => {
    const nextContent = content();
    if (!nextContent || nextContent.kind !== "binary") return null;
    return toDataUrlFromBinaryContent({
      content: nextContent.content,
      mime: nextContent.mime,
      encoding: nextContent.encoding,
      fallbackMime: "image/*",
    });
  });

  const pdfSrc = createMemo(() => {
    const nextContent = content();
    if (!nextContent || nextContent.kind !== "binary") return null;
    return toDataUrlFromBinaryContent({
      content: nextContent.content,
      mime: nextContent.mime,
      encoding: nextContent.encoding,
      fallbackMime: "application/pdf",
    });
  });
  const contentSize = createMemo(() => {
    const nextContent = content();
    if (!nextContent) return undefined;
    if (nextContent.kind === "binary" || nextContent.kind === "none") {
      return nextContent.size;
    }
    return undefined;
  });

  return (
    <div data-file-widget-root="true" class="flex min-h-0 flex-1 flex-col bg-card text-card-foregroun h-full">
      <Switch fallback={
        <PlaceholderViewer
          path={path()}
          renderer={renderer()}
          isDeleted={isDeleted()}
          size={contentSize()}
          permissions={inspectData()?.permissions}
          mimeType={inspectData()?.mime ?? undefined}
          lastModified={inspectData()?.lastModified}
        />
      }>
        <Match when={loading()}>
          <div class="flex flex-1 items-center justify-center">
            <span class="font-mono text-xs text-muted-foreground">Loading...</span>
          </div>
        </Match>

        <Match when={error()}>
          {(message) => (
            <div class="flex flex-1 items-center justify-center p-4">
              <span class="break-all font-mono text-xs text-destructive">{message()}</span>
            </div>
          )}
        </Match>

        <Match when={(renderer() === "code" || renderer() === "markdown" || renderer() === "text") && content()?.kind === "text"}>
          <CodeEditor
            content={(content() as { kind: "text"; content: string; truncated: boolean }).content}
            path={path()}
            truncated={(content() as { kind: "text"; content: string; truncated: boolean }).truncated}
            onSave={saveContent}
            onDirty={setDirty}
          />
        </Match>

        <Match when={renderer() === "image" && content()?.kind === "binary"}>
          <ImageViewer
            src={imageSrc()}
            path={path()}
            isDeleted={isDeleted()}
            onContentReady={({ width, height }) => {
              requestInitialSize({ width: Math.min(width + 24, 1200), height: Math.min(height + 56, 900) });
            }}
          />
        </Match>

        <Match when={renderer() === "pdf" && content()?.kind === "binary"}>
          <Suspense fallback={<div class="flex flex-1 items-center justify-center"><span class="font-mono text-xs text-muted-foreground">Loading PDF viewer...</span></div>}>
            <PdfViewer
              src={pdfSrc()}
              path={path()}
              isDeleted={isDeleted()}
              onContentReady={requestInitialSize}
            />
          </Suspense>
        </Match>
      </Switch>
    </div>
  );
}
