import { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";
import { TCanvasDoc } from "@vibecanvas/shell/automerge/index";
import type * as schema from "@vibecanvas/shell/database/schema";
import { createEffect, createResource, Match, Switch } from "solid-js";
import { findDocument } from "../services/automerge";
import { CanvasService } from "../services/canvas/Canvas.service";
import { CanvasMode, Theme } from "../services/canvas/enum";

export type TBackendCanvas = typeof schema.canvas.$inferSelect;

type CanvasPageProps = {
  canvas: TBackendCanvas;
  store: {
    sidebarVisible: () => boolean;
    onToggleSidebar: () => void;
  },
  notification: {
    showSuccess(title: string, description?: string): void
    showError(title: string, description?: string): void
    showInfo(title: string, description?: string): void
  }
};

export function Canvas(props: CanvasPageProps) {
  let containerRef!: HTMLDivElement;
  let activeHandle: DocHandle<TCanvasDoc> | null = null;
  let canvasService: CanvasService | null = null;
  const [docHandle] = createResource(() => props.canvas.automerge_url as AutomergeUrl, async (url) => {
    try {
      return await findDocument(url);
    } catch (e) {
      console.error("[CanvasPage] Failed to load automerge doc:", e);
      props.notification.showError("Failed to load automerge doc");
      throw e
    }
  });

  createEffect(() => {
    const nextHandle = docHandle();
    if (!nextHandle || nextHandle === activeHandle) return;

    activeHandle = nextHandle;
    if (canvasService) {
      canvasService.destroy();
      canvasService = null;
    }

    canvasService = new CanvasService({
      mode: CanvasMode.SELECT,
      theme: Theme.DARK,

    }, containerRef);
  });

  return <div ref={containerRef} class="relative w-full h-full bg-gray-400/10">
    <Switch>
      <Match when={docHandle.loading}>
        <div>Loading...</div>
      </Match>
      <Match when={docHandle.error}>
        <div>Error</div>
      </Match>
    </Switch>
  </div>;
}