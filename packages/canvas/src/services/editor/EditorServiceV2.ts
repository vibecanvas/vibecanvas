import type { IService } from "@vibecanvas/runtime";
import type { TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { SyncHook } from "@vibecanvas/tapable";
import type Konva from "konva";
import type { KonvaEventObject, Node, NodeConfig } from "konva/lib/Node";
import type { Shape } from "konva/lib/Shape";
import type { IHooks } from "src/runtime";
import type { SceneService } from "../scene/SceneService";

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
    editingTextChange: new SyncHook(),
    editingShape1dChange: new SyncHook(),
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
  private previewNode: Konva.Shape | null = null;
  private previewOrigin: TEditorToolCanvasPoint | null = null;
  transformer: Konva.Transformer | null = null;

  constructor(private sceneService: SceneService) { }
  /**
   * Adds or replaces a tool in the editor registry.
   */
  registerTool(portal: { hooks: IHooks }, tool: TEditorTool) {
    this.tools.set(tool.id, tool);

    // setup create-draw
    if (tool.behavior.type === "mode" && tool.behavior.mode === "draw-create") {
      if(!tool.drawCreate) throw new Error(`drawCreate is required for tool ${tool.id}`);
      console.log(tool)
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

        // commit should happen here before clearing preview state
        this.setPreviewNode(null);
      });

      this.hooks.activeToolChange.tap((activeToolId) => {
        if (activeToolId === tool.id) {
          return;
        }

        if (!this.previewNode) {
          return;
        }

        this.setPreviewNode(null);
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
  private setPreviewNode(node: Konva.Shape | null) {
    if (this.previewNode === node) {
      return;
    }

    if (node === null) {
      this.previewNode?.destroy();
      this.previewOrigin = null;
      this.previewNode = null;
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
