import { Show, createSignal, onMount, onCleanup, createEffect } from "solid-js";
import * as pdfjsLib from "pdfjs-dist";

// Configure worker - must be done before any PDF operations
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

type TPDFViewerProps = {
  src: string | null;
  path: string;
  isDeleted: boolean;
};

export function PDFViewer(props: TPDFViewerProps) {
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [numPages, setNumPages] = createSignal(0);
  const [currentPage, setCurrentPage] = createSignal(1);

  let canvasRef: HTMLCanvasElement | undefined;
  let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;

  const renderPage = async (pageNum: number) => {
    if (!pdfDoc || !canvasRef) return;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = canvasRef;
      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;
    } catch (err) {
      console.error("Error rendering page:", err);
      setError("Failed to render page");
    }
  };

  const loadPDF = async (base64Src: string) => {
    setLoading(true);
    setError(null);

    try {
      // Decode base64 to Uint8Array
      const binaryString = atob(base64Src);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const loadingTask = pdfjsLib.getDocument({ data: bytes });
      pdfDoc = await loadingTask.promise;

      setNumPages(pdfDoc.numPages);
      setCurrentPage(1);
      await renderPage(1);
      setLoading(false);
    } catch (err) {
      console.error("Error loading PDF:", err);
      setError("Failed to load PDF");
      setLoading(false);
    }
  };

  const goToPrevPage = () => {
    if (currentPage() > 1) {
      const newPage = currentPage() - 1;
      setCurrentPage(newPage);
      renderPage(newPage);
    }
  };

  const goToNextPage = () => {
    if (currentPage() < numPages()) {
      const newPage = currentPage() + 1;
      setCurrentPage(newPage);
      renderPage(newPage);
    }
  };

  onMount(() => {
    if (props.src) {
      loadPDF(props.src);
    }
  });

  createEffect(() => {
    const src = props.src;
    if (src) {
      loadPDF(src);
    }
  });

  onCleanup(() => {
    if (pdfDoc) {
      pdfDoc.destroy();
      pdfDoc = null;
    }
  });

  return (
    <div class="flex-1 flex flex-col overflow-hidden bg-muted/20">
      <Show when={props.isDeleted}>
        <div class="flex-1 flex items-center justify-center">
          <div class="flex flex-col items-center gap-3 text-center">
            <div class="font-mono text-xs text-destructive">File deleted</div>
            <div class="max-w-full truncate font-mono text-xs text-muted-foreground">{props.path}</div>
          </div>
        </div>
      </Show>

      <Show when={!props.isDeleted}>
        <Show when={!props.src}>
          <div class="flex-1 flex items-center justify-center">
            <div class="font-mono text-xs text-muted-foreground">No PDF data</div>
          </div>
        </Show>

        <Show when={props.src}>
          <Show when={loading()}>
            <div class="flex-1 flex items-center justify-center">
              <span class="font-mono text-xs text-muted-foreground">Loading PDF...</span>
            </div>
          </Show>

          <Show when={error()}>
            <div class="flex-1 flex items-center justify-center">
              <span class="font-mono text-xs text-destructive">{error()}</span>
            </div>
          </Show>

          <Show when={!loading() && !error()}>
            <div class="flex-1 flex flex-col overflow-hidden">
              <div class="flex-1 overflow-auto flex items-start justify-center p-2">
                <canvas ref={canvasRef} class="border border-border" />
              </div>

              <Show when={numPages() > 1}>
                <div class="flex items-center justify-center gap-4 py-2 border-t border-border bg-muted/30">
                  <button
                    class="px-2 py-1 text-xs font-mono border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={goToPrevPage}
                    disabled={currentPage() <= 1}
                  >
                    PREV
                  </button>
                  <span class="font-mono text-xs">
                    {currentPage()} / {numPages()}
                  </span>
                  <button
                    class="px-2 py-1 text-xs font-mono border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={goToNextPage}
                    disabled={currentPage() >= numPages()}
                  >
                    NEXT
                  </button>
                </div>
              </Show>
            </div>
          </Show>
        </Show>
      </Show>
    </div>
  );
}
