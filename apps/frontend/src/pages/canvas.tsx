import { Show, type Component } from "solid-js";
import { useParams } from "@solidjs/router";
import { store } from "@/store";

const CanvasPage: Component = () => {
  const params = useParams<{ id: string }>();
  const canvas = () => store.canvases.find(c => c.id === params.id);

  return (
    <Show
      when={canvas()}
      fallback={
        <div class="flex items-center justify-center h-full">
          <p class="text-xs text-muted-foreground font-mono">Loading canvas...</p>
        </div>
      }
    >
      {(c) => (
        <div class="flex items-center justify-center h-full">
          <div class="text-center space-y-2">
            <h2 class="text-lg font-display tracking-wide text-foreground">
              {c().name}
            </h2>
            <p class="text-xs text-muted-foreground font-mono">
              {c().id}
            </p>
            <p class="text-xs text-muted-foreground font-mono">
              {c().automerge_url}
            </p>
          </div>
        </div>
      )}
    </Show>
  );
};

export default CanvasPage;
