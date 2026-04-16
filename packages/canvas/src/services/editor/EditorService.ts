import type { IService, IStartableService } from "@vibecanvas/runtime";
import type { IServiceContext } from "@vibecanvas/runtime/interface.js";
import { SyncHook } from "@vibecanvas/tapable";
import type Konva from "konva";
import type { IHooks, IRuntimeConfig } from "src/runtime";
import type { CanvasRegistryService } from "../canvas-registry/CanvasRegistryService";
import type { CrdtService } from "../crdt/CrdtService";
import type { SceneService } from "../scene/SceneService";
import type { SelectionService } from "../selection/SelectionService";
import { fxGetCanvasPoint } from "./fx.get-canvas-point";
import type { TEditorServiceHooks, TEditorTool, TEditorToolCanvasPoint, TEditorToolPointerEvent, } from "./types";
export * from "./types";

/**
 * Owns tool registry and transient editor state.
 */
export class EditorService implements IService<TEditorServiceHooks>, IStartableService {
  readonly name = "editor";

  readonly hooks: TEditorServiceHooks = {
    toolsChange: new SyncHook(),
    activeToolChange: new SyncHook(),
    editingTextChange: new SyncHook(),
    editingShape1dChange: new SyncHook(),
  };

  private readonly tools = new Map<string, TEditorTool>();
  private readonly runtimeHooks!: IHooks;

  activeToolId = "select";
  editingTextId: string | null = null;
  editingShape1dId: string | null = null;
  private previewNode: Konva.Shape | null = null;
  private previewOrigin: TEditorToolCanvasPoint | null = null;

  constructor(
    private sceneService: SceneService,
    private canvasRegistry: CanvasRegistryService,
    private crdt: CrdtService,
    private selection: SelectionService,
  ) { }

  start(ctx: IServiceContext<IHooks, IRuntimeConfig>): void | Promise<void> {
    // @ts-expect-error this is safe, start runs before any use
    this.runtimeHooks = ctx.hooks;
  }
  /**
   * Adds or replaces a tool in the editor registry.
   */
  registerTool(tool: TEditorTool) {
    this.tools.set(tool.id, tool);

    // setup create-draw
    if (tool.behavior.type === "mode" && tool.behavior.mode === "draw-create" && tool.drawCreate) {
      this.runtimeHooks.pointerDown.tap((event) => {
        if (this.activeToolId !== tool.id) {
          return;
        }

        const point = fxGetCanvasPoint({ scene: this.sceneService }, { event });
        if (!point) {
          return;
        }

        const preview = tool.drawCreate?.startDraft({ event, point });
        this.previewOrigin = point;
        if (preview) {
          this.setPreviewNode(preview);
        }
      });

      this.runtimeHooks.pointerMove.tap((event) => {
        if (this.activeToolId !== tool.id) {
          return;
        }

        if (!this.previewNode || !this.previewOrigin) {
          return;
        }

        const point = fxGetCanvasPoint({ scene: this.sceneService }, { event: event as TEditorToolPointerEvent });
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

      this.runtimeHooks.pointerUp.tap(() => {
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
}
