import { store } from "@/store";
import type { TBackendCanvas } from "@/types/backend.types";
import type { DocHandle } from "@automerge/automerge-repo";
import type { TCanvasDoc } from "@vibecanvas/shell/automerge/index";
import { createEffect, onCleanup, onMount } from "solid-js";
import { CanvasService } from "../service/canvas.service";

interface ICanvasProps {
  handle: DocHandle<TCanvasDoc>;
  data: TBackendCanvas;
}

export function Canvas(props: ICanvasProps) {
  let container!: HTMLDivElement;
  let canvasService: CanvasService | null = null;

  onMount(() => {
    void props.handle;
    void props.data;

    canvasService = new CanvasService({
      container,
      activeTool: store.activeTool,
      gridVisible: store.gridVisible,
    });
  });

  createEffect(() => {
    const activeTool = store.activeTool;
    canvasService?.setActiveTool(activeTool);
  });

  createEffect(() => {
    const gridVisible = store.gridVisible;
    canvasService?.setGridVisible(gridVisible);
  });

  onCleanup(() => {
    canvasService?.destroy();
  });

  return <div ref={container} class="size-full" />;
}
