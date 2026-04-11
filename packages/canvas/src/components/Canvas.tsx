import { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";
import { TCanvasDoc } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type * as schema from "@vibecanvas/service-db/schema";
import { createEffect, createResource, Match, onCleanup, Switch } from "solid-js";
import { findDocument } from "../services/automerge";
import type { TCloneImage, TDeleteImage, TFileCapability, TFiletreeCapability, TTerminalCapability, TUploadImage } from "../services/canvas/interface";
import type { IRuntime } from "@vibecanvas/runtime";
import { buildRuntime } from "../runtime";

export type TBackendCanvas = typeof schema.canvas.$inferSelect;

type CanvasPageProps = {
  canvas: TBackendCanvas;
  image?: {
    uploadImage: TUploadImage;
    cloneImage: TCloneImage;
    deleteImage: TDeleteImage;
  };
  filetree?: TFiletreeCapability;
  file?: TFileCapability;
  terminal?: TTerminalCapability;
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
  let runtime: IRuntime | null = null;
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
    if (runtime) {
      runtime.shutdown()
      runtime = null;
    }
    runtime = buildRuntime({
      container: containerRef,
      docHandle: nextHandle,
      onToggleSidebar: props.store.onToggleSidebar,
      env: {
        DEV: import.meta.env.DEV,
      }
    })

    void runtime.boot();
  });

  onCleanup(() => {
    runtime?.shutdown();
    runtime = null;
    activeHandle = null;
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
