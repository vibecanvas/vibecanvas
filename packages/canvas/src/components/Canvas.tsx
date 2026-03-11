import { createSignal, onCleanup, onMount } from "solid-js";
import { CanvasService } from "../canvas.service";
import { FloatingCanvasToolbar, IFloatingCanvasToolbarProps } from "./floating-canvas-toolbar/FloatingCanvasToolbar";
import { bindCanvasStoreToToolTarget } from "../canvas.store";
import { DEFAULT_CANVAS_RENDERER, isCanvasRenderer, type CanvasRenderer } from "../renderer.types";

interface ICanvasProps extends IFloatingCanvasToolbarProps {
  renderer?: CanvasRenderer;
}

function resolveRenderer(renderer: CanvasRenderer | undefined): CanvasRenderer {
  if (renderer) {
    return renderer;
  }

  const rendererParam = new URLSearchParams(window.location.search).get("renderer");

  return isCanvasRenderer(rendererParam) ? rendererParam : DEFAULT_CANVAS_RENDERER;
}

export function Canvas(props: ICanvasProps) {
  let hostRef!: HTMLDivElement;
  const [canvasService, setCanvasService] = createSignal<CanvasService | null>(null);

  bindCanvasStoreToToolTarget(canvasService);

  onMount(async () => {
    setCanvasService(new CanvasService(hostRef, { renderer: resolveRenderer(props.renderer) }));
  });

  onCleanup(() => {
    canvasService()?.destroy();
  });

  return (
    <>
      <FloatingCanvasToolbar {...props} />
      <div class="block size-full" ref={hostRef} />
    </>
  )
}
