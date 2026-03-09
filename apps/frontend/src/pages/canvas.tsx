import type { Component } from "solid-js";
import { useParams } from "@solidjs/router";

const CanvasPage: Component = () => {
  const params = useParams<{ id: string }>();

  return (
    <div class="flex items-center justify-center h-full">
      <div class="text-center space-y-2">
        <h2 class="text-lg font-display tracking-wide text-foreground">
          Canvas
        </h2>
        <p class="text-xs text-muted-foreground font-mono">
          {params.id}
        </p>
      </div>
    </div>
  );
};

export default CanvasPage;
