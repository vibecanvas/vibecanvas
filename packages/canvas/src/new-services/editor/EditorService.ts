import type { IService } from "@vibecanvas/runtime";
import { SyncHook } from "@vibecanvas/tapable";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
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

export type TEditorToElement = (node: Konva.Node) => TElement | null;
export type TEditorUpdateShapeFromTElement = (element: TElement) => boolean;

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
  toElementRegistryChange: SyncHook<[]>;
  updateShapeFromTElementRegistryChange: SyncHook<[]>;
}

/**
 * Holds editor-only transient state.
 * Also owns tool registry, current active tool,
 * transform refs, and node<->element registries.
 */
export class EditorService implements IService<TEditorServiceHooks> {
  readonly name = "editor";
  readonly hooks: TEditorServiceHooks = {
    toolsChange: new SyncHook(),
    activeToolChange: new SyncHook(),
    editingTextChange: new SyncHook(),
    editingShape1dChange: new SyncHook(),
    previewNodeChange: new SyncHook(),
    transformerChange: new SyncHook(),
    toElementRegistryChange: new SyncHook(),
    updateShapeFromTElementRegistryChange: new SyncHook(),
  };

  readonly tools = new Map<string, TEditorTool>();
  readonly toElementRegistry = new Map<string, TEditorToElement>();
  readonly updateShapeFromTElementRegistry = new Map<string, TEditorUpdateShapeFromTElement>();

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

  /**
   * Registers one node -> element serializer.
   * First serializer that returns a value wins.
   */
  registerToElement(id: string, toElement: TEditorToElement) {
    this.toElementRegistry.set(id, toElement);
    this.hooks.toElementRegistryChange.call();
  }

  /**
   * Removes one node -> element serializer.
   */
  unregisterToElement(id: string) {
    const didDelete = this.toElementRegistry.delete(id);
    if (!didDelete) {
      return;
    }

    this.hooks.toElementRegistryChange.call();
  }

  /**
   * Converts a node into a canvas element through registered serializers.
   */
  toElement(node: Konva.Node) {
    for (const toElement of this.toElementRegistry.values()) {
      const element = toElement(node);
      if (element) {
        return element;
      }
    }

    return null;
  }

  /**
   * Registers one element -> node updater.
   * First updater that handles the element wins.
   */
  registerUpdateShapeFromTElement(id: string, updateShapeFromTElement: TEditorUpdateShapeFromTElement) {
    this.updateShapeFromTElementRegistry.set(id, updateShapeFromTElement);
    this.hooks.updateShapeFromTElementRegistryChange.call();
  }

  /**
   * Removes one element -> node updater.
   */
  unregisterUpdateShapeFromTElement(id: string) {
    const didDelete = this.updateShapeFromTElementRegistry.delete(id);
    if (!didDelete) {
      return;
    }

    this.hooks.updateShapeFromTElementRegistryChange.call();
  }

  /**
   * Applies an element onto an existing runtime node through registered updaters.
   */
  updateShapeFromTElement(element: TElement) {
    for (const updateShapeFromTElement of this.updateShapeFromTElementRegistry.values()) {
      if (updateShapeFromTElement(element)) {
        return true;
      }
    }

    return false;
  }
}
