import { debounce, throttle } from "@solid-primitives/scheduled";
import AlertTriangle from "lucide-solid/icons/alert-triangle";
import ChevronLeft from "lucide-solid/icons/chevron-left";
import ChevronRight from "lucide-solid/icons/chevron-right";
import FileArchive from "lucide-solid/icons/file-archive";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Show, createEffect, createSignal, onCleanup, onMount } from "solid-js";

GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

type TPdfViewerProps = {
  src: string | null;
  path: string;
  isDeleted: boolean;
  onContentReady?: (size: { width: number; height: number }) => void;
};

type TLoadedDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<{
    getViewport: (params: { scale: number }) => { width: number; height: number };
    render: (params: {
      canvasContext: CanvasRenderingContext2D;
      viewport: { width: number; height: number };
      transform?: [number, number, number, number, number, number];
    }) => { promise: Promise<void>; cancel?: () => void };
  }>;
  destroy: () => Promise<void>;
};

function getBytesFromDataUrl(content: string) {
  const normalized = content.includes(",") ? content.split(",")[1] : content;
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function PdfViewer(props: TPdfViewerProps) {
  const [pdfDocument, setPdfDocument] = createSignal<TLoadedDocument | null>(null);
  const [pageNumber, setPageNumber] = createSignal(1);
  const [pageCount, setPageCount] = createSignal(0);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [containerWidth, setContainerWidth] = createSignal(0);
  const [didReportSize, setDidReportSize] = createSignal(false);

  let canvasElement: HTMLCanvasElement | undefined;
  let containerElement: HTMLDivElement | undefined;
  let resizeObserver: ResizeObserver | null = null;
  let renderCycle = 0;
  let activeDocument: TLoadedDocument | null = null;
  let activeRenderTask: { promise: Promise<void>; cancel?: () => void } | null = null;
  let isMounted = true;

  const applyContainerWidth = (nextWidth: number) => {
    if (!isMounted) return;
    setContainerWidth((current) => (Math.abs(current - nextWidth) >= 1 ? nextWidth : current));
  };

  const setContainerWidthThrottled = throttle((nextWidth: number) => {
    applyContainerWidth(nextWidth);
  }, 80);

  const setContainerWidthDebounced = debounce((nextWidth: number) => {
    applyContainerWidth(nextWidth);
  }, 180);

  const isRenderCancelledError = (nextError: unknown) => {
    if (!(nextError instanceof Error)) return false;
    return nextError.name === "RenderingCancelledException" || nextError.message.includes("Rendering cancelled");
  };

  const cancelActiveRender = async () => {
    const task = activeRenderTask;
    activeRenderTask = null;
    if (!task) return;

    try {
      task.cancel?.();
      await task.promise;
    } catch {
      // expected on cancellation
    }
  };

  const clearDocument = async () => {
    await cancelActiveRender();

    const document = activeDocument;
    activeDocument = null;
    setPdfDocument(null);
    setPageCount(0);
    setPageNumber(1);

    if (!document) return;

    try {
      await document.destroy();
    } catch {
      // noop
    }
  };

  const loadDocument = async () => {
    setError(null);
    setLoading(false);
    setDidReportSize(false);

    if (!props.src) {
      await clearDocument();
      return;
    }

    try {
      await clearDocument();
      const bytes = getBytesFromDataUrl(props.src);
      const loadingTask = getDocument({ data: bytes });
      const document = (await loadingTask.promise) as unknown as TLoadedDocument;
      activeDocument = document;
      setPdfDocument(document);
      setPageCount(document.numPages);
      setPageNumber(1);
    } catch {
      setError("Failed to open PDF");
      await clearDocument();
    }
  };

  const renderCurrentPage = async () => {
    const document = pdfDocument();
    const page = pageNumber();
    const width = containerWidth();

    if (!document || !canvasElement || !containerElement || width <= 0) return;

    const cycle = ++renderCycle;
    await cancelActiveRender();
    if (cycle !== renderCycle) return;

    setLoading(true);
    setError(null);

    let renderTask: { promise: Promise<void>; cancel?: () => void } | null = null;

    try {
      const pdfPage = await document.getPage(page);
      const baseViewport = pdfPage.getViewport({ scale: 1 });

      if (!didReportSize()) {
        const fitWidth = Math.min(Math.max(baseViewport.width + 24, 360), 960);
        const fitHeight = Math.min(Math.max(baseViewport.height + 64, 260), 1200);
        props.onContentReady?.({ width: fitWidth, height: fitHeight });
        setDidReportSize(true);
      }

      const targetWidth = Math.max(width - 16, 1);
      const scale = targetWidth / baseViewport.width;
      const viewport = pdfPage.getViewport({ scale });
      const context = canvasElement.getContext("2d");
      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      const cssWidth = Math.ceil(viewport.width);
      const cssHeight = Math.ceil(viewport.height);

      if (!context) throw new Error("Missing canvas context");

      canvasElement.width = Math.floor(cssWidth * outputScale);
      canvasElement.height = Math.floor(cssHeight * outputScale);
      canvasElement.style.width = `${cssWidth}px`;
      canvasElement.style.height = `${cssHeight}px`;

      const transform = outputScale !== 1
        ? [outputScale, 0, 0, outputScale, 0, 0] as [number, number, number, number, number, number]
        : undefined;

      renderTask = pdfPage.render({
        canvasContext: context,
        viewport,
        transform,
      });
      activeRenderTask = renderTask;
      await renderTask.promise;

      if (activeRenderTask === renderTask) activeRenderTask = null;
      if (cycle === renderCycle) setLoading(false);
    } catch (nextError) {
      if (activeRenderTask === renderTask) activeRenderTask = null;
      if (cycle !== renderCycle || isRenderCancelledError(nextError)) return;
      if (cycle === renderCycle) {
        setLoading(false);
        setError("Failed to render page");
      }
    }
  };

  createEffect(() => {
    void loadDocument();
  });

  createEffect(() => {
    void renderCurrentPage();
  });

  onMount(() => {
    if (!containerElement) return;

    applyContainerWidth(containerElement.clientWidth);
    resizeObserver = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width ?? 0;
      setContainerWidthThrottled(nextWidth);
      setContainerWidthDebounced(nextWidth);
    });
    resizeObserver.observe(containerElement);
  });

  onCleanup(() => {
    isMounted = false;
    resizeObserver?.disconnect();
    resizeObserver = null;
    void clearDocument();
  });

  return (
    <div class="flex min-h-0 flex-1 flex-col bg-muted/20">
      <Show when={props.isDeleted} fallback={
        <>
          <div class="flex h-8 items-center justify-between border-b border-border px-2 font-mono text-[11px]">
            <div class="text-muted-foreground">PDF</div>
            <div class="flex items-center gap-2">
              <button
                class="flex h-6 w-6 items-center justify-center border border-border disabled:opacity-40"
                disabled={pageNumber() <= 1 || !pdfDocument()}
                onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
                title="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              <span class="min-w-[64px] text-center text-muted-foreground">
                {pageCount() > 0 ? `${pageNumber()} / ${pageCount()}` : "-- / --"}
              </span>
              <button
                class="flex h-6 w-6 items-center justify-center border border-border disabled:opacity-40"
                disabled={pageNumber() >= pageCount() || !pdfDocument()}
                onClick={() => setPageNumber((current) => Math.min(pageCount(), current + 1))}
                title="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div ref={containerElement} class="flex min-h-0 flex-1 items-start justify-center overflow-auto p-2">
            <Show when={props.src} fallback={
              <div class="flex h-full w-full flex-col items-center justify-center gap-3 text-center">
                <FileArchive size={48} class="text-muted-foreground" />
                <div class="font-mono text-xs text-muted-foreground">No PDF data</div>
              </div>
            }>
              <div class="relative">
                <Show when={loading()}>
                  <div class="absolute inset-0 flex items-center justify-center bg-background/80 font-mono text-xs text-muted-foreground">
                    Rendering...
                  </div>
                </Show>
                <Show when={error()}>
                  {(message) => (
                    <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 px-2 text-center">
                      <AlertTriangle size={24} class="text-destructive" />
                      <div class="font-mono text-xs text-destructive">{message()}</div>
                    </div>
                  )}
                </Show>
                <canvas ref={canvasElement} class="border border-border bg-white" />
              </div>
            </Show>
          </div>
        </>
      }>
        <div class="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <AlertTriangle size={48} class="text-destructive" />
          <div class="font-mono text-xs text-destructive">File deleted</div>
          <div class="max-w-full truncate font-mono text-xs text-muted-foreground">{props.path}</div>
        </div>
      </Show>
    </div>
  );
}
