import type { IService } from "@vibecanvas/runtime";
import { SyncHook } from "@vibecanvas/tapable";
import type Konva from "konva";

/**
 * Runtime mode for a registered editor tool.
 * Used to map tool choice into broad editor behavior.
 */
export type TEditorToolMode = "select" | "hand" | "draw-create" | "click-create";

/**
 * Keyboard shortcut description for a tool.
 * Examples: `5`, `r`, `ctrl+b`.
 */
export type TEditorToolShortcut = string;

/**
 * Tool metadata registered by feature plugins.
 * Toolbar should render from this registry instead of hardcoded tool lists.
 */
export type TEditorTool = {
  id: string;
  label: string;
  icon?: string;
  shortcuts?: TEditorToolShortcut[];
  group?: string;
  priority?: number;
  active?: boolean;
  onSelect?: () => void;
  behavior:
    | { type: "mode"; mode: TEditorToolMode }
    | { type: "action" }
    | { type: "modal" };
};

/**
 * Editor-local hook bag.
 * Used for tool registry changes and active tool changes.
 */
export interface TEditorServiceHooks {
  toolsChange: SyncHook<[]>;
  activeToolChange: SyncHook<[string]>;
}

/**
 * Holds editor-only transient state.
 * Also owns the tool registry and current active tool.
 */
export class EditorService implements IService<TEditorServiceHooks> {
  readonly name = "editor";
  readonly hooks: TEditorServiceHooks = {
    toolsChange: new SyncHook(),
    activeToolChange: new SyncHook(),
  };

  readonly tools = new Map<string, TEditorTool>();

  activeToolId = "select";
  editingTextId: string | null = null;
  editingShape1dId: string | null = null;
  previewNode: Konva.Node | null = null;
  transformer: Konva.Transformer | null = null;

  /**
   * Adds or replaces a tool in the editor registry.
   */
  registerTool(tool: TEditorTool) {
    this.tools.set(tool.id, tool);
    this.hooks.toolsChange.call();
  }

  /**
   * Removes a tool from the editor registry.
   */
  unregisterTool(id: string) {
    const didDelete = this.tools.delete(id);
    if (!didDelete) {
      return;
    }

    if (this.activeToolId === id) {
      this.activeToolId = "select";
      this.hooks.activeToolChange.call(this.activeToolId);
    }

    this.hooks.toolsChange.call();
  }

  /**
   * Returns one registered tool by id.
   */
  getTool(id: string) {
    return this.tools.get(id);
  }

  /**
   * Returns registered tools in stable toolbar order.
   * Priority is expected in the range 0..10000.
   */
  getTools() {
    return [...this.tools.values()].sort((left, right) => {
      const leftPriority = left.priority ?? 10000;
      const rightPriority = right.priority ?? 10000;
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return left.label.localeCompare(right.label);
    });
  }

  /**
   * Sets the current active tool if it exists.
   */
  setActiveTool(id: string) {
    if (!this.tools.has(id)) {
      return;
    }

    if (this.activeToolId === id) {
      return;
    }

    this.activeToolId = id;
    this.hooks.activeToolChange.call(id);
  }

  /**
   * Returns the current active tool entry.
   */
  getActiveTool() {
    return this.tools.get(this.activeToolId);
  }
}
