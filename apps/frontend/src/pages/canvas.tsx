import { createEffect, createSignal, onCleanup, onMount, Show, type Component } from "solid-js";
import type { TBackendCanvas } from "@/types/backend.types";
import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";
import type { TCanvasDoc } from "@vibecanvas/shell/automerge/index";
import { findDocument } from "@/services/automerge";
import { initBridge, type BridgeHandle } from "@/bridge/sync";
import { showErrorToast } from "@/components/ui/Toast";
import { CanvasService } from "@/feature/canvas/service/canvas.service";

type CanvasPageProps = {
  canvas: TBackendCanvas;
};

const CanvasPage: Component<CanvasPageProps> = (props) => {
  const [docState, setDocState] = createSignal<"loading" | "ready" | "error">("loading");
  let bridgeHandle: BridgeHandle | null = null;
  let canvasRef!: HTMLCanvasElement;

  onMount(async () => {
    console.log(props)

  });

  createEffect(async () => {
    try {
      const handle = await findDocument(props.canvas.automerge_url as AutomergeUrl);
      bridgeHandle = initBridge(handle);
      setDocState("ready");
      const canvasService = new CanvasService(canvasRef);
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
    <div class="flex items-center justify-center h-full">
      <Show when={docState() === "ready"}>
        <canvas class="w-full h-full" ref={canvasRef} />
      </Show>
      <Show when={docState() === "loading"}>
        <p class="text-xs text-muted-foreground font-mono">Loading canvas...</p>
      </Show>
      <Show when={docState() === "error"}>
        <p class="text-xs text-destructive font-mono">Failed to load canvas document</p>
      </Show>
    </div>
  );
};

export default CanvasPage;
