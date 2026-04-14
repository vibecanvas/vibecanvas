import type { TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
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
export type TEditorToolIcon = string;

/**
 * Tool metadata registered by feature plugins.
 * Toolbar should render from this registry instead of hardcoded tool lists.
 */
export type TEditorTool = {
  id: string;
  label: string;
  icon?: TEditorToolIcon;
  shortcuts?: TEditorToolShortcut[];
  group?: string; // planned for dropdown
  priority?: number;
  active?: boolean;
  onSelect?: () => void;
  behavior:
    | { type: "mode"; mode: TEditorToolMode }
    | { type: "action" }
    | { type: "modal" };
};

export type TEditorToElement = (node: Konva.Node) => TElement | null;
export type TEditorToGroup = (node: Konva.Node) => TGroup | null;
export type TEditorCreateGroupFromTGroup = (group: TGroup) => Konva.Group | null;
export type TEditorCreateShapeFromTElement = (element: TElement) => Konva.Group | Konva.Shape | null;
export type TEditorSetupExistingShape = (node: Konva.Node) => boolean;
export type TEditorUpdateShapeFromTElement = (element: TElement) => boolean;
export type TEditorCloneElement = (args: { sourceElement: TElement; clonedElement: TElement }) => boolean;

/**
 * Editor-local hook bag.
 * Used for tool registry, editing state, preview, transformer,
 * and node<->element registry changes.
 */
export interface TEditorServiceHooks {
  toolsChange: SyncHook<[]>;
  activeToolChange: SyncHook<[string]>;
  editingTextChange: SyncHook<[string | null]>;
  editingShape1dChange: SyncHook<[string | null]>;
  previewNodeChange: SyncHook<[Konva.Node | null]>;
  transformerChange: SyncHook<[Konva.Transformer | null]>;
}

/**
 * Holds editor-only transient state.
 * Also owns tool registry, current active tool,
 * transform refs, and node<->element registries.
 */
export class EditorServiceV2 implements IService<TEditorServiceHooks> {
  readonly name = "editorV2";

  readonly hooks: TEditorServiceHooks = {
    toolsChange: new SyncHook(),
    activeToolChange: new SyncHook(),
    editingTextChange: new SyncHook(),
    editingShape1dChange: new SyncHook(),
    previewNodeChange: new SyncHook(),
    transformerChange: new SyncHook(),
  };

  private readonly tools = new Map<string, TEditorTool>();
  private readonly toElementRegistry = new Map<string, TEditorToElement>();
  private readonly toGroupRegistry = new Map<string, TEditorToGroup>();
  private readonly createGroupFromTGroupRegistry = new Map<string, TEditorCreateGroupFromTGroup>();
  private readonly createShapeFromTElementRegistry = new Map<string, TEditorCreateShapeFromTElement>();
  private readonly setupExistingShapeRegistry = new Map<string, TEditorSetupExistingShape>();
  private readonly updateShapeFromTElementRegistry = new Map<string, TEditorUpdateShapeFromTElement>();
  private readonly cloneElementRegistry = new Map<string, TEditorCloneElement>();

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

  /**
   * Sets current editing text node id.
   */
  setEditingTextId(id: string | null) {
    if (this.editingTextId === id) {
      return;
    }

    this.editingTextId = id;
    this.hooks.editingTextChange.call(id);
  }

  /**
   * Sets current editing 1d shape node id.
   */
  setEditingShape1dId(id: string | null) {
    if (this.editingShape1dId === id) {
      return;
    }

    this.editingShape1dId = id;
    this.hooks.editingShape1dChange.call(id);
  }

  /**
   * Sets current preview node.
   */
  setPreviewNode(node: Konva.Node | null) {
    if (this.previewNode === node) {
      return;
    }

    this.previewNode = node;
    this.hooks.previewNodeChange.call(node);
  }

  /**
   * Sets shared transformer instance.
   */
  setTransformer(transformer: Konva.Transformer | null) {
    if (this.transformer === transformer) {
      return;
    }

    this.transformer = transformer;
    this.hooks.transformerChange.call(transformer);
  }

}
