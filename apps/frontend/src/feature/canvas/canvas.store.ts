import { createStore } from "solid-js/store";
import { Tool } from "./components/floating-canvas-toolbar/toolbar.types";

interface ICanvasStore {
  activeTool: Tool;
  isToolbarCollapsed: boolean;
}

export const [canvasStore, setCanvasStore] = createStore<ICanvasStore>({
  activeTool: 'hand',
  isToolbarCollapsed: false,
})