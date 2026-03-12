import { store, setStore } from "@/store";
import type { TBackendCanvas } from "@/types/backend.types";
import type { DocHandle } from "@automerge/automerge-repo";
import type { TCanvasDoc } from "@vibecanvas/shell/automerge/index";
import { onCleanup, onMount } from "solid-js";
import { CanvasService } from "../service/canvas.service";

interface ICanvasProps {
  handle: DocHandle<TCanvasDoc>;
  data: TBackendCanvas;
}

export function Canvas(props: ICanvasProps) {
  let container!: HTMLDivElement;
  let canvasService: CanvasService | null = null;

  onMount(() => {
    void props.data;

    canvasService = new CanvasService({
      container,
      handle: props.handle,
      getSidebarVisible: () => store.sidebarVisible,
      onToggleSidebar: () => setStore("sidebarVisible", (v) => !v),
    });
  });

  onCleanup(() => {
    canvasService?.destroy();
  });

  return <div ref={container} class="relative size-full" />;
}
