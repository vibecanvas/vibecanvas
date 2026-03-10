import { createSignal, onCleanup, onMount } from "solid-js";
import { CanvasService } from "../canvas.service";
import { FloatingCanvasToolbar } from "./floating-canvas-toolbar/FloatingCanvasToolbar";
import { bindCanvasStoreToToolTarget } from "../canvas.store";

export function Canvas() {
  let canvasRef!: HTMLCanvasElement;
  const [canvasService, setCanvasService] = createSignal<CanvasService | null>(null);

  bindCanvasStoreToToolTarget(canvasService);

  onMount(async () => {
    setCanvasService(new CanvasService(canvasRef));
  });

  onCleanup(() => {
    canvasService()?.destroy();
  });

  return (
    <>
      <FloatingCanvasToolbar />
      <canvas class="block size-full" ref={canvasRef} />
    </>
  )
}
