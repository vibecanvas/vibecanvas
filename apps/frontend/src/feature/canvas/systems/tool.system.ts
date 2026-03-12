import { createComponent } from "solid-js";
import { render } from "solid-js/web";
import { FloatingCanvasToolbar } from "../components/FloatingCanvasToolbar";
import { TOOL_SHORTCUTS, type TTool } from "../components/toolbar.types";
import type { TCanvasInputContext } from "../types/canvas-context.types";
import type { TInputManagerEventMap } from "../managers/input.manager";
import {
  AbstractCanvasSystem,
  type TCanvasSystemInputContext,
  type TCanvasSystemRuntimeContext,
} from "./system.abstract";

type TToolSystemState = {
  disposeRender: (() => void) | null;
  mountElement: HTMLDivElement | null;
};

/**
 * Owns the canvas-local toolbar UI and related keyboard shortcuts.
 *
 * This system is the bridge between canvas-local tool state and HTML overlay UI.
 * It renders the toolbar into the canvas overlay root and handles keyboard
 * shortcuts for tool switching, grid visibility, and sidebar toggling.
 */
class ToolSystem extends AbstractCanvasSystem<TCanvasInputContext, TToolSystemState> {
  readonly name = "tool";

  readonly input: AbstractCanvasSystem<TCanvasInputContext, TToolSystemState>["input"];

  readonly drawing: AbstractCanvasSystem<TCanvasInputContext, TToolSystemState>["drawing"];

  constructor() {
    super({
      priority: 0,
      state: {
        disposeRender: null,
        mountElement: null,
      },
    });

    this.input = {
      onKeyDown: this.onKeyDown.bind(this),
    };

    this.drawing = {
      mount: this.mount.bind(this),
      unmount: this.unmount.bind(this),
    };
  }

  private onKeyDown(
    context: TCanvasSystemInputContext<TCanvasInputContext>,
    event: TInputManagerEventMap["keydown"],
  ) {
    const target = event.target;

    if (target instanceof HTMLElement) {
      if (
        target.isContentEditable ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      ) {
        return false;
      }
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
      event.preventDefault();
      context.data.toggleSidebarVisible();
      return true;
    }

    if (event.metaKey || event.ctrlKey || event.altKey) return false;

    if (event.key.toLowerCase() === "g") {
      event.preventDefault();
      context.data.toggleGridVisible();
      return true;
    }

    const tool = TOOL_SHORTCUTS[event.key] ?? TOOL_SHORTCUTS[event.key.toLowerCase()];
    if (!tool) return false;

    event.preventDefault();
    this.selectTool(context, tool);
    return true;
  }

  private mount(context: TCanvasSystemRuntimeContext<TCanvasInputContext>) {
    const mountElement = document.createElement("div");
    mountElement.className = "absolute inset-0 pointer-events-none";
    context.data.overlayRoot.appendChild(mountElement);

    const disposeRender = render(
      () =>
        createComponent(FloatingCanvasToolbar, {
          activeTool: context.data.getActiveTool,
          gridVisible: context.data.getGridVisible,
          sidebarVisible: context.data.getSidebarVisible,
          onToolSelect: (tool) => this.selectToolFromRuntime(context, tool),
          onToggleGrid: context.data.toggleGridVisible,
          onToggleSidebar: context.data.toggleSidebarVisible,
        }),
      mountElement,
    );

    this.state.mountElement = mountElement;
    this.state.disposeRender = disposeRender;
  }

  private unmount() {
    this.state.disposeRender?.();
    this.state.mountElement?.remove();
    this.state.disposeRender = null;
    this.state.mountElement = null;
  }

  private selectTool(
    context: TCanvasSystemInputContext<TCanvasInputContext>,
    tool: TTool,
  ) {
    if (tool === "image") {
      context.data.openImagePicker();
      return;
    }

    context.data.setActiveTool(tool);
  }

  private selectToolFromRuntime(
    context: TCanvasSystemRuntimeContext<TCanvasInputContext>,
    tool: TTool,
  ) {
    if (tool === "image") {
      context.data.openImagePicker();
      return;
    }

    context.data.setActiveTool(tool);
  }
}

export { ToolSystem };
