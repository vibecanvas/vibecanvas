import type { IService } from "@vibecanvas/runtime";
import type { TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { SyncHook } from "@vibecanvas/tapable";
import type Konva from "konva";
import type { KonvaEventObject, Node, NodeConfig } from "konva/lib/Node";
import type { IHooks } from "src/runtime";
import type { CanvasRegistryService, TCanvasRegistrySelectionStyleValues } from "../canvas-registry/CanvasRegistryService";
import type { CrdtService } from "../crdt/CrdtService";
import type { SceneService } from "../scene/SceneService";
import type { SelectionService } from "../selection/SelectionService";

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
export type TEditorToolPointerEvent = KonvaEventObject<PointerEvent, Node<NodeConfig>>;
export type TEditorToolCanvasPoint = {
  x: number;
  y: number;
  pressure: number;
};

export type TEditorToolDrawCreateStartDraftArgs = {
  event: TEditorToolPointerEvent;
  point: TEditorToolCanvasPoint;
};

export type TEditorToolDrawCreateUpdateDraftArgs = {
  draft: unknown;
  event: TEditorToolPointerEvent;
  point: TEditorToolCanvasPoint;
  origin: TEditorToolCanvasPoint;
  shiftKey: boolean;
  now: number;
};

export type TEditorToolDrawCreateBehavior = {
  startDraft: (args: TEditorToolDrawCreateStartDraftArgs) => Konva.Shape;
  updateDraft: (previewNode: Konva.Shape, args: TEditorToolDrawCreateUpdateDraftArgs) => unknown;
};

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
  drawCreate?: TEditorToolDrawCreateBehavior;
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
  toolSelectionStyleChange: SyncHook<[string]>;
  editingTextChange: SyncHook<[string | null]>;
  editingShape1dChange: SyncHook<[string | null]>;
  transformerChange: SyncHook<[Konva.Transformer | null]>;
}

function getCanvasPoint(scene: SceneService, event: TEditorToolPointerEvent): TEditorToolCanvasPoint | null {
  const point = scene.dynamicLayer.getRelativePointerPosition();
  if (!point) {
    return null;
  }

  const pressure = typeof event.evt.pressure === "number"
    && Number.isFinite(event.evt.pressure)
    && event.evt.pressure > 0
      ? event.evt.pressure
      : 0.5;

  return {
    x: point.x,
    y: point.y,
    pressure,
  };
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
    toolSelectionStyleChange: new SyncHook(),
    editingTextChange: new SyncHook(),
    editingShape1dChange: new SyncHook(),
    transformerChange: new SyncHook(),
  };

  private readonly tools = new Map<string, TEditorTool>();
  private readonly toolSelectionStyleValues = new Map<string, Partial<TCanvasRegistrySelectionStyleValues>>();

  activeToolId = "select";
  editingTextId: string | null = null;
  editingShape1dId: string | null = null;
  private previewNode: Konva.Shape | null = null;
  private previewOrigin: TEditorToolCanvasPoint | null = null;
  transformer: Konva.Transformer | null = null;

  constructor(
    private sceneService: SceneService,
    private canvasRegistry: CanvasRegistryService,
    private crdt: CrdtService,
    private selection: SelectionService,
  ) { }
  /**
   * Adds or replaces a tool in the editor registry.
   */
  registerTool(portal: { hooks: IHooks }, tool: TEditorTool) {
    this.tools.set(tool.id, tool);

    // setup create-draw
    if (tool.behavior.type === "mode" && tool.behavior.mode === "draw-create" && tool.drawCreate) {
      portal.hooks.pointerDown.tap((event) => {
        if (this.activeToolId !== tool.id) {
          return;
        }

        const point = getCanvasPoint(this.sceneService, event);
        if (!point) {
          return;
        }

        const preview = tool.drawCreate?.startDraft({ event, point });
        this.previewOrigin = point;
        if (preview) {
          this.setPreviewNode(preview);
        }
      });

      portal.hooks.pointerMove.tap((event) => {
        if (this.activeToolId !== tool.id) {
          return;
        }

        if (!this.previewNode || !this.previewOrigin) {
          return;
        }

        const point = getCanvasPoint(this.sceneService, event as TEditorToolPointerEvent);
        if (!point) {
          return;
        }

        tool.drawCreate?.updateDraft(this.previewNode, {
          draft: this.previewNode,
          event: event as TEditorToolPointerEvent,
          point,
          origin: this.previewOrigin,
          shiftKey: event.evt.shiftKey,
          now: Date.now(),
        });
      });

      portal.hooks.pointerUp.tap(() => {
        if (this.activeToolId !== tool.id) {
          return;
        }

        if (!this.previewNode) {
          return;
        }

        this.commitPreview();
      });

      this.hooks.activeToolChange.tap((activeToolId) => {
        if (activeToolId === tool.id) {
          return;
        }

        if (!this.previewNode) {
          return;
        }

        this.abortPreview();
      });
    }

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

  getToolSelectionStyleValues(toolId: string) {
    return structuredClone(this.toolSelectionStyleValues.get(toolId) ?? {});
  }

  setToolSelectionStyleValue<K extends keyof TCanvasRegistrySelectionStyleValues>(
    toolId: string,
    key: K,
    value: TCanvasRegistrySelectionStyleValues[K],
  ) {
    const next = {
      ...(this.toolSelectionStyleValues.get(toolId) ?? {}),
      [key]: value,
    } satisfies Partial<TCanvasRegistrySelectionStyleValues>;
    this.toolSelectionStyleValues.set(toolId, next);
    this.hooks.toolSelectionStyleChange.call(toolId);
  }

  /**
   * Returns persisted element data for one runtime node.
   */
  toElement(node: Konva.Node) {
    return this.canvasRegistry.toElement(node);
  }

  /**
   * Returns persisted group data for one runtime node.
   */
  toGroup(node: Konva.Node) {
    return this.canvasRegistry.toGroup(node);
  }

  /**
   * Creates one runtime group node from persisted group data.
   */
  createGroupFromTGroup(group: TGroup) {
    return this.canvasRegistry.createNodeFromGroup(group);
  }

  /**
   * Creates one runtime shape or group node from persisted element data.
   */
  createShapeFromTElement(element: TElement) {
    return this.canvasRegistry.createNodeFromElement(element);
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
   * Starts alt-drag clone behavior for one existing runtime node.
   * Element-specific clone implementation stays in the canvas registry.
   */
  startDragClone(args: {
    node: Konva.Node;
    selection: Array<Konva.Group | Konva.Shape>;
  }) {
    return this.canvasRegistry.createDragClone(args);
  }

  private clearPreviewState() {
    this.previewOrigin = null;
    this.previewNode = null;
  }

  private abortPreview() {
    this.previewNode?.destroy();
    this.clearPreviewState();
    this.sceneService.dynamicLayer.batchDraw();
  }

  private commitPreview() {
    if (!this.previewNode) {
      return;
    }

    const previewNode = this.previewNode;
    const element = this.canvasRegistry.toElement(previewNode);
    if (!element) {
      this.abortPreview();
      return;
    }
    element.id = crypto.randomUUID()
    previewNode.moveTo(this.sceneService.staticForegroundLayer);
    this.canvasRegistry.attachListeners(previewNode);
    const builder = this.crdt.build();
    builder.patchElement(element.id, element);
    builder.commit();
    this.selection.setSelection([previewNode]);
    this.selection.setFocusedNode(previewNode);
    this.clearPreviewState();
    this.sceneService.dynamicLayer.batchDraw();
    this.sceneService.staticForegroundLayer.batchDraw();
  }

  /**
   * Sets current preview node.
   */
  private setPreviewNode(node: Konva.Shape | null) {
    if (this.previewNode === node) {
      return;
    }

    if (node === null) {
      this.abortPreview();
      return;
    }

    this.sceneService.dynamicLayer.add(node);
    this.previewNode = node;
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
