import { createStore } from "solid-js/store";
import { createEffect, type Accessor } from "solid-js";
import { Tool } from "./components/floating-canvas-toolbar/toolbar.types";

interface ICanvasStore {
  activeTool: Tool;
  isToolbarCollapsed: boolean;
}

type TCanvasToolSyncTarget = {
  queueActiveTool: (tool: Tool) => void;
};

export const [canvasStore, setCanvasStore] = createStore<ICanvasStore>({
  activeTool: 'hand',
  isToolbarCollapsed: false,
})

export function bindCanvasStoreToToolTarget(
  getTarget: Accessor<TCanvasToolSyncTarget | null>,
): void {
  createEffect(() => {
    const target = getTarget();

    if (!target) {
      return;
    }

    target.queueActiveTool(canvasStore.activeTool);
  });
}
