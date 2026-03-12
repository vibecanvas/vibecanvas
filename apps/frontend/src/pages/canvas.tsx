import { showErrorToast } from "@/components/ui/Toast";
import { Canvas } from "@/feature/canvas/components/canvas";
import { findDocument } from "@/services/automerge";
import type { TBackendCanvas } from "@/types/backend.types";
import type { AutomergeUrl } from "@automerge/automerge-repo";
import { createResource, createSignal, Match, onCleanup, Switch, type Component } from "solid-js";

type CanvasPageProps = {
  canvas: TBackendCanvas;
};

const CanvasPage: Component<CanvasPageProps> = (props) => {
  const [docState, setDocState] = createSignal<"loading" | "ready" | "error">("loading");

  const [docHandle] = createResource(() => props.canvas.automerge_url as AutomergeUrl, async (url) => {
    try {
      const docHandle = await findDocument(url);
      setDocState("ready");
      return docHandle
    } catch (e) {
      console.error("[CanvasPage] Failed to load automerge doc:", e);
      showErrorToast("Failed to load automerge doc");
      setDocState("error");
      throw e
    }
  })

  onCleanup(() => {
    docHandle()?.unload()
  });

  return (
    <div class="relative size-full overflow-hidden">
      <Switch>
        <Match when={docState() === "loading"}>
          <div class="absolute inset-0 flex items-center justify-center bg-background/80">
            <p class="text-xs text-muted-foreground font-mono">Loading canvas...</p>
          </div>
        </Match>
        <Match when={docState() === "error"}>
          <div class="absolute inset-0 flex items-center justify-center bg-background/80">
            <p class="text-xs text-destructive font-mono">Failed to load canvas document</p>
          </div>
        </Match>
        <Match when={docState() === "ready"}>
          <Canvas data={props.canvas} handle={docHandle()!} />
        </Match>
      </Switch>
    </div>
  );
};

export default CanvasPage;
