import { showErrorToast } from "@/components/ui/Toast";
import { Canvas } from "@/feature/canvas/components/canvas";
import { findDocument } from "@/services/automerge";
import type { TBackendCanvas } from "@/types/backend.types";
import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";
import type { TCanvasDoc } from "@vibecanvas/shell/automerge/types/canvas-doc";
import { createEffect, createResource, Match, Show, Switch, type Component } from "solid-js";

type CanvasPageProps = {
  canvas: TBackendCanvas;
};

const CanvasPage: Component<CanvasPageProps> = (props) => {
  let activeHandle: DocHandle<TCanvasDoc> | null = null;

  const [docHandle] = createResource(() => props.canvas.automerge_url as AutomergeUrl, async (url) => {
    try {
      return await findDocument(url);
    } catch (e) {
      console.error("[CanvasPage] Failed to load automerge doc:", e);
      showErrorToast("Failed to load automerge doc");
      throw e
    }
  });

  createEffect(() => {
    const nextHandle = docHandle();
    if (!nextHandle || nextHandle === activeHandle) return;

    activeHandle = nextHandle;
  });

  return (
    <div class="relative size-full overflow-hidden">
      <Switch>
        <Match when={docHandle.loading}>
          <div class="absolute inset-0 flex items-center justify-center bg-background/80">
            <p class="text-xs text-muted-foreground font-mono">Loading canvas...</p>
          </div>
        </Match>
        <Match when={Boolean(docHandle.error)}>
          <div class="absolute inset-0 flex items-center justify-center bg-background/80">
            <p class="text-xs text-destructive font-mono">Failed to load canvas document</p>
          </div>
        </Match>
        <Match when={!docHandle.loading && docHandle()}>
          <Show when={docHandle()} keyed>
            {(handle) => <Canvas data={props.canvas} handle={handle} />}
          </Show>
        </Match>
      </Switch>
    </div>
  );
};

export default CanvasPage;
