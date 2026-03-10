import { createSignal, Match, onCleanup, onMount, Show, Switch, type Component } from "solid-js";
import type { TBackendCanvas } from "@/types/backend.types";
import type { AutomergeUrl } from "@automerge/automerge-repo";
import { findDocument } from "@/services/automerge";
import { initBridge, type BridgeHandle } from "@/bridge/sync";
import { showErrorToast } from "@/components/ui/Toast";
import { CanvasService } from "@/feature/canvas/canvas.service";
import { FloatingCanvasToolbar } from "@/feature/canvas/components/floating-canvas-toolbar/FloatingCanvasToolbar";
import { Canvas } from "@/feature/canvas/components/Canvas";

type CanvasPageProps = {
  canvas: TBackendCanvas;
};

const CanvasPage: Component<CanvasPageProps> = (props) => {
  const [docState, setDocState] = createSignal<"loading" | "ready" | "error">("loading");
  let bridgeHandle: BridgeHandle | null = null;

  onMount(async () => {
    try {
      const docHandle = await findDocument(props.canvas.automerge_url as AutomergeUrl);
      bridgeHandle = initBridge(docHandle);
      setDocState("ready");
    } catch (e) {
      console.error("[CanvasPage] Failed to load automerge doc:", e);
      showErrorToast("Failed to load automerge doc");
      setDocState("error");
    }
  });

  onCleanup(() => {
    bridgeHandle?.cleanup();
    bridgeHandle = null;
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
          <Canvas />
        </Match>
      </Switch>
    </div>
  );
};

export default CanvasPage;
