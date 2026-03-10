import { onCleanup, onMount } from "solid-js";
import { CanvasService } from "../canvas.service";
import { FloatingCanvasToolbar } from "./floating-canvas-toolbar/FloatingCanvasToolbar";
import { showErrorToast } from "@/components/ui/Toast";

export function Canvas() {
  let canvasRef!: HTMLCanvasElement;
  let canvasService: CanvasService | null = null;

  onMount(async () => {
    canvasService = new CanvasService(canvasRef);
  });

  onCleanup(() => {
    canvasService?.destroy();
  });

  return (
    <>
      <FloatingCanvasToolbar />
      <canvas class="block size-full" ref={canvasRef} />
    </>
  )
}