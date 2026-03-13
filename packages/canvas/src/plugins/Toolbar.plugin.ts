import { render } from "solid-js/web";
import type { IPlugin, IPluginContext } from "./interface";
import { Accessor, createComponent, createSignal, Setter } from "solid-js";
import { FloatingCanvasToolbar } from "../components/FloatingCanvasToolbar";
import { TTool } from "../components/FloatingCanvasToolbar/toolbar.types";

function mountSolidComponent(context: IPluginContext, activeTool: Accessor<TTool>, setActiveTool: Setter<TTool>, onToggleGrid: () => void, onToggleSidebar: () => void) {
  const mountElement = document.createElement("div");
  mountElement.className = "absolute inset-0 pointer-events-none";
  context.stage.container().appendChild(mountElement);

  const disposeRender = render(
    () =>
      createComponent(FloatingCanvasToolbar, {
        activeTool,
        gridVisible: () => true,
        sidebarVisible: () => true,
        onToolSelect: setActiveTool,
        onToggleGrid,
        onToggleSidebar,
      }),
    mountElement,
  );

  return { mountElement, disposeRender }
}

export class ToolbarPlugin implements IPlugin {
  #activeTool: Accessor<TTool>
  #setActiveTool: Setter<TTool>
  #mountElement: HTMLDivElement | null = null;
  #disposeRender: (() => void) | null = null;

  constructor(private onToggleSidebar: () => void) {
    const [activeTool, setActiveTool] = createSignal<TTool>('hand');
    this.#activeTool = activeTool;
    this.#setActiveTool = setActiveTool;
  }

  apply(context: IPluginContext): void {
    context.hooks.init.tap(() => {
      const { mountElement, disposeRender } = mountSolidComponent(context, this.#activeTool, this.#setActiveTool, () => { }, this.onToggleSidebar)
      this.#mountElement = mountElement;
      this.#disposeRender = disposeRender;
    })

    context.hooks.destroy.tap(() => {
      this.#disposeRender?.();
      this.#mountElement?.remove();
      this.#disposeRender = null;
      this.#mountElement = null;
    })
  }
}
