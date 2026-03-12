import { TOOL_SHORTCUTS } from "../components/toolbar.types";
import type { TCanvasInputContext } from "../types/canvas-context.types";
import { AbstractCanvasSystem, type TCanvasSystemInputContext } from "./system.abstract";
import type { TInputManagerEventMap } from "../managers/input.manager";

/**
 * Handles keyboard shortcuts for tool switching, grid toggle, and sidebar toggle.
 *
 * This system runs at low priority so higher-priority systems (like pan's Space
 * key handling) can claim events first. Single-letter and number shortcuts only
 * fire when no modifier keys are held, preventing collisions with browser or
 * app-level combos.
 *
 * Shortcuts handled:
 * - tool letter/number keys from TOOL_SHORTCUTS (e.g. `r` -> rectangle, `1` -> select)
 * - `g` -> toggle grid visibility
 * - `Cmd/Ctrl+b` -> toggle sidebar visibility
 */
class ToolSystem extends AbstractCanvasSystem<TCanvasInputContext, Record<string, never>> {
  readonly name = "tool";

  #onKeyDown = (
    context: TCanvasSystemInputContext<TCanvasInputContext>,
    event: TInputManagerEventMap["keydown"],
  ) => {
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

    // Cmd/Ctrl+B -> toggle sidebar
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
      event.preventDefault();
      context.data.toggleSidebarVisible();
      return true;
    }

    // Ignore other modified shortcuts
    if (event.metaKey || event.ctrlKey || event.altKey) return false;

    // G -> toggle grid
    if (event.key.toLowerCase() === "g") {
      event.preventDefault();
      context.data.toggleGridVisible();
      return true;
    }

    // Tool shortcuts
    const tool = TOOL_SHORTCUTS[event.key] ?? TOOL_SHORTCUTS[event.key.toLowerCase()];
    if (!tool) return false;

    event.preventDefault();

    if (tool === "image") {
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          window.dispatchEvent(
            new CustomEvent("canvas:image-selected", { detail: { file } }),
          );
        }
      };
      fileInput.click();
      return true;
    }

    context.data.setActiveTool(tool);
    return true;
  };

  readonly input = {
    onKeyDown: this.#onKeyDown,
  };

  readonly drawing = {};

  constructor() {
    super({ priority: 0, state: {} });
  }
}

export { ToolSystem };
