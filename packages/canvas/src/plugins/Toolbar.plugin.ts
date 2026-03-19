import { render } from "solid-js/web";
import type { IPlugin, IPluginContext } from "./interface";
import { Accessor, createComponent, createEffect, createSignal, Setter } from "solid-js";
import { FloatingCanvasToolbar } from "../components/FloatingCanvasToolbar";
import { TOOL_SHORTCUTS, TTool } from "../components/FloatingCanvasToolbar/toolbar.types";
import { CustomEvents } from "../custom-events";
import { CanvasMode } from "../services/canvas/enum";

function getShortcutTool(event: KeyboardEvent): TTool | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null;

  if (event.key === "Escape") {
    return TOOL_SHORTCUTS.Escape;
  }

  const normalizedKey = event.key.toLowerCase();
  return TOOL_SHORTCUTS[normalizedKey] ?? null;
}

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
  #toolBeforeSpaceHold: TTool | null = null;
  #mountElement: HTMLDivElement | null = null;
  #disposeRender: (() => void) | null = null;

  constructor(private onToggleSidebar: () => void) {
    const [activeTool, setActiveTool] = createSignal<TTool>('select');
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

    context.hooks.customEvent.tap((event, payload) => {
      if (event === CustomEvents.TOOL_SELECT) {
        this.#setActiveTool(payload)
      }
      return false;
    })


    this.setupKeyShortcuts(context)
    this.setupEffects(context)
    this.setupDrawElement(context)
  }

  private setupDrawElement(context: IPluginContext) { }

  private setupEffects(context: IPluginContext) {
    createEffect(() => {
      const value = this.#activeTool()
      if (value === 'select') {
        context.setState('mode', CanvasMode.SELECT)
      } else if (value === 'hand') {
        context.setState('mode', CanvasMode.HAND)
      } else if (["rectangle", "diamond", "ellipse"].includes(value)) {
        context.setState('mode', CanvasMode.DRAW_CREATE)
      } else {
        context.setState('mode', CanvasMode.CLICK_CREATE)
      }
      context.hooks.customEvent.call(CustomEvents.TOOL_SELECT, value);
    })

    createEffect(() => {
      const value = this.#gridVisible();
      context.hooks.customEvent.call(CustomEvents.GRID_VISIBLE, value);
    });

    createEffect(() => {
      const value = context.state.mode
      switch (value) {
        case CanvasMode.SELECT:
          context.stage.container().style.cursor = 'default'
          break;
        case CanvasMode.HAND:
          context.stage.container().style.cursor = 'grab'
          break;
        case CanvasMode.DRAW_CREATE:
          context.stage.container().style.cursor = 'crosshair'
          break;
        case CanvasMode.CLICK_CREATE:
          context.stage.container().style.cursor = 'pointer'
          break;
        default:
          context.stage.container().style.cursor = 'default'
          break;
      }
    })

  }

  private setupKeyShortcuts(context: IPluginContext) {
    context.hooks.keydown.tap(event => {
      if (event.key === " ") {
        event.preventDefault();

        if (this.#toolBeforeSpaceHold === null) {
          const currentTool = this.#activeTool();
          this.#toolBeforeSpaceHold = currentTool;

          if (currentTool !== "hand") {
            this.#setActiveTool("hand");
          }
        }

        return true;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        this.onToggleSidebar();
        return true;
      }

      const tool = getShortcutTool(event);
      if (tool) {
        if (tool !== 'hand') {
          context.setState('selection', [])
        }

        this.#setActiveTool(tool);
        return true;
      }

      if (event.key.toLowerCase() === "g" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        this.#setGridVisible((value) => !value);
        return true;
      }

      return false;
    })

    context.hooks.keyup.tap(event => {
      if (event.key !== " ") {
        return false;
      }

      event.preventDefault();

      if (this.#toolBeforeSpaceHold !== null) {
        this.#setActiveTool(this.#toolBeforeSpaceHold);
        this.#toolBeforeSpaceHold = null;
      }

      return true;
    })
  }
}
