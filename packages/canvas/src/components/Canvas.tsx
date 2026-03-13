import { findDocument } from "../service/automerge";
import { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";
import { TCanvasDoc } from "@vibecanvas/shell/automerge/index";
import type * as schema from "@vibecanvas/shell/database/schema";
import { createEffect, createResource, createSignal, Match, Switch } from "solid-js";

export type TBackendCanvas = typeof schema.canvas.$inferSelect;

type CanvasPageProps = {
  canvas: TBackendCanvas;
  notification: {
    showSuccess(title: string, description?: string): void
    showError(title: string, description?: string): void
    showInfo(title: string, description?: string): void
  }
};

type TState = 'loading' | 'error' | 'ready';

export function Canvas(props: CanvasPageProps) {
  let containerRef!: HTMLDivElement;
  let activeHandle: DocHandle<TCanvasDoc> | null = null;

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
  });

  return <div ref={containerRef} class="relative w-full h-full bg-gray-400/10">
    <Switch>
      <Match when={docHandle.loading}>
        <div>Loading...</div>
      </Match>
      <Match when={docHandle.error}>
        <div>Error</div>
      </Match>
      <Match when={docHandle()}>
        <div>Ready</div>
      </Match>
    </Switch>
  </div>;
}