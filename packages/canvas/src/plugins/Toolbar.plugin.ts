import { render } from "solid-js/web";
import type { IPlugin, IPluginContext } from "./interface";
import { Accessor, createComponent, createEffect, createReaction, createSignal, Setter } from "solid-js";
import { FloatingCanvasToolbar } from "../components/FloatingCanvasToolbar";
import { TTool } from "../components/FloatingCanvasToolbar/toolbar.types";

function mountSolidComponent(context: IPluginContext, activeTool: Accessor<TTool>, setActiveTool: Setter<TTool>, gridVisible: Accessor<boolean>, setGridVisible: Setter<boolean>, onToggleSidebar: () => void) {
  const mountElement = document.createElement("div");
  mountElement.className = "absolute inset-0 pointer-events-none";
  context.stage.container().appendChild(mountElement);

  const disposeRender = render(
    () =>
      createComponent(FloatingCanvasToolbar, {
        activeTool,
        gridVisible,
        sidebarVisible: () => true,
        onToolSelect: setActiveTool,
        onToggleGrid: () => setGridVisible((value) => !value),
        onToggleSidebar,
      }),
    mountElement,
  );

  return { mountElement, disposeRender }
}

export class ToolbarPlugin implements IPlugin {
  #activeTool: Accessor<TTool>
  #setActiveTool: Setter<TTool>
  #gridVisible: Accessor<boolean>
  #setGridVisible: Setter<boolean>
  #mountElement: HTMLDivElement | null = null;
  #disposeRender: (() => void) | null = null;

  constructor(private onToggleSidebar: () => void) {
    const [activeTool, setActiveTool] = createSignal<TTool>('hand');
    this.#activeTool = activeTool;
    this.#setActiveTool = setActiveTool;
    const [gridVisible, setGridVisible] = createSignal(true);
    this.#gridVisible = gridVisible;
    this.#setGridVisible = setGridVisible;

  }

  apply(context: IPluginContext): void {
    context.hooks.init.tap(() => {
      const { mountElement, disposeRender } = mountSolidComponent(context, this.#activeTool, this.#setActiveTool, this.#gridVisible, this.#setGridVisible, this.onToggleSidebar)
      this.#mountElement = mountElement;
      this.#disposeRender = disposeRender;
    })

    context.hooks.destroy.tap(() => {
      this.#disposeRender?.();
      this.#mountElement?.remove();
      this.#disposeRender = null;
      this.#mountElement = null;
    })

    createEffect(() => {
      const value = this.#gridVisible();
      console.log(value)
      context.hooks.customEvent.call('grid-visible', value);
    })

  }
}
