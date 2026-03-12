import Konva from "konva";
import type { DocHandle } from "@automerge/automerge-repo";
import type { TCanvasDoc } from "@vibecanvas/shell/automerge/index";
import { createSignal, type Accessor, type Setter } from "solid-js";
import { CameraSystem } from "../managers/camera.manager";
import { CrdtManager } from "../managers/crdt.manager";
import { InputManager, type TInputSystem } from "../managers/input.manager";
import { SelectionManager } from "../managers/selection.manager";
import { TransformManager } from "../managers/transform.manager";
import type { TTool } from "../components/toolbar.types";
import { PanSystem } from "../systems/pan.system";
import { PenSystem } from "../systems/pen.system";
import { SelectBoxSystem } from "../systems/select-box.system";
import { AbstractCanvasSystem, type TCanvasSystemRuntimeContext } from "../systems/system.abstract";
import { ToolSystem } from "../systems/tool.system";
import { ZoomSystem } from "../systems/zoom.system";
import { logCanvasDebug } from "../utils/canvas-debug";
import { renderGrid } from "../utils/grid-renderer";
import type { TCanvasElementDraft, TCanvasInputContext } from "../types/canvas-context.types";
import { Node } from "konva/lib/Node";

type TCanvasServiceArgs = {
  container: HTMLDivElement;
  handle: DocHandle<TCanvasDoc>;
  getSidebarVisible: () => boolean;
  onToggleSidebar: () => void;
};

/**
 * Owns the full Konva canvas runtime.
 *
 * The Solid component should only mount/unmount this service and push external UI
 * state into it. All Konva objects, layers, systems, camera wiring, resize logic,
 * and transient drawing state live here.
 */
export class CanvasService {
  #stage: Konva.Stage;
  #camera: CameraSystem;
  #inputManager: InputManager<TCanvasInputContext>;
  #resizeObserver: ResizeObserver;
  #stageRoot: HTMLDivElement;
  #overlayRoot: HTMLDivElement;
  #gridLayer: Konva.Layer;
  #worldShapes: Konva.Group;
  #worldOverlay: Konva.Group;
  #transform: TransformManager;
  #cleanupCameraSubscription: (() => void) | null = null;
  #cleanupSelectionSubscription: (() => void) | null = null;
  #crdtManager: CrdtManager;
  #previewNodes = new Map<string, Konva.Shape | Konva.Group>();
  #selection: SelectionManager;
  #systems: AbstractCanvasSystem<TCanvasInputContext, unknown>[] = [];
  #context: TCanvasInputContext;
  #selectedTool: Accessor<TTool>;
  #setSelectedToolSignal: Setter<TTool>;
  #temporaryTool: Accessor<TTool | null>;
  #setTemporaryToolSignal: Setter<TTool | null>;
  #gridVisible: Accessor<boolean>;
  #setGridVisibleSignal: Setter<boolean>;
  #suppressNextClickSelection = false;

  constructor(args: TCanvasServiceArgs) {
    [this.#selectedTool, this.#setSelectedToolSignal] = createSignal<TTool>("select");
    [this.#temporaryTool, this.#setTemporaryToolSignal] = createSignal<TTool | null>(null);
    [this.#gridVisible, this.#setGridVisibleSignal] = createSignal(true);

    logCanvasDebug("[canvas-service] mounted", {
      activeTool: this.#activeTool(),
      gridVisible: this.#gridVisible(),
    });

    args.container.replaceChildren();

    this.#stageRoot = document.createElement("div");
    this.#stageRoot.className = "absolute inset-0";

    this.#overlayRoot = document.createElement("div");
    this.#overlayRoot.className = "absolute inset-0 pointer-events-none";

    args.container.append(this.#stageRoot, this.#overlayRoot);

    this.#stage = new Konva.Stage({
      container: this.#stageRoot,
      width: this.#stageRoot.clientWidth || args.container.clientWidth || 1,
      height: this.#stageRoot.clientHeight || args.container.clientHeight || 1,
    });

    this.#gridLayer = new Konva.Layer();
    const shapesLayer = new Konva.Layer();
    const overlayLayer = new Konva.Layer();

    this.#worldShapes = new Konva.Group();
    this.#worldOverlay = new Konva.Group();
    this.#transform = new TransformManager({
      worldOverlay: this.#worldOverlay,
      onTransformStart: () => {
        logCanvasDebug("[transform-manager] transformstart");
      },
      onTransform: () => {
        logCanvasDebug("[transform-manager] transform");
      },
      onTransformEnd: () => {
        logCanvasDebug("[transform-manager] transformend");
      },
    });
    shapesLayer.add(this.#worldShapes);
    overlayLayer.add(this.#worldOverlay);
    this.#stage.add(this.#gridLayer, shapesLayer, overlayLayer);

    this.#camera = new CameraSystem();
    this.#selection = new SelectionManager();
    this.#camera.registerTarget(this.#worldShapes);
    this.#camera.registerTarget(this.#worldOverlay);
    this.#cleanupCameraSubscription = this.#camera.onChange(() => {
      this.#redrawSystems();
    });
    this.#cleanupSelectionSubscription = this.#selection.onChange(() => {
      this.#applySelectionStyles();
      this.#syncTransformer();
    });

    this.#context = {
      camera: this.#camera,
      overlayRoot: this.#overlayRoot,
      getActiveTool: this.#activeTool,
      setActiveTool: (tool) => {
        this.#setSelectedToolSignal(tool);
        this.#setTemporaryToolSignal(null);
        this.#syncTransformer();
      },
      setTemporaryTool: (tool) => {
        this.#setTemporaryToolSignal(tool);
        this.#syncTransformer();
      },
      getGridVisible: this.#gridVisible,
      toggleGridVisible: () => {
        this.#setGridVisibleSignal((value) => !value);
        this.#redrawSystems();
      },
      getSidebarVisible: args.getSidebarVisible,
      toggleSidebarVisible: args.onToggleSidebar,
      openImagePicker: () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = (event) => {
          const file = (event.target as HTMLInputElement).files?.[0];
          if (file) {
            window.dispatchEvent(new CustomEvent("canvas:image-selected", { detail: { file } }));
          }
        };
        input.click();
      },
      selection: this.#selection,
      getSelectableNodes: () => this.#getSelectableNodes(),
      mountPreviewNode: (ownerId, node) => {
        this.#mountPreviewNode(ownerId, node);
      },
      unmountPreviewNode: (ownerId) => {
        this.#unmountPreviewNode(ownerId);
      },
      suppressNextClickSelection: () => {
        this.#suppressNextClickSelection = true;
      },
      createElement: (draft) => {
        this.#createElement(draft);
      },
    };

    this.#inputManager = new InputManager<TCanvasInputContext>({
      stage: this.#stage,
      context: this.#context,
      defaultCursor: "default",
    });

    this.#crdtManager = new CrdtManager({
      handle: args.handle,
      worldShapes: this.#worldShapes,
      onReconcile: () => {
        this.#syncSelectionToScene();
      },
    });
    this.#crdtManager.mount();
    this.#registerStageSelectionEvents();

    this.#systems = [
      new ZoomSystem(),
      new SelectBoxSystem(),
      new PenSystem(),
      new PanSystem(),
      new ToolSystem(),
    ];

    for (const system of this.#systems) {
      this.#inputManager.registerSystem(this.#toInputSystem(system));
      system.mount?.(this.#runtimeContext());
    }

    this.#resizeObserver = new ResizeObserver(() => {
      this.#stage.size({
        width: this.#stageRoot.clientWidth || args.container.clientWidth || 1,
        height: this.#stageRoot.clientHeight || args.container.clientHeight || 1,
      });
      this.#redrawSystems();
      this.#stage.batchDraw();
    });

    this.#resizeObserver.observe(args.container);
    this.#redrawSystems();
    this.#syncSelectionToScene();
  }

  destroy() {
    const runtimeContext = this.#runtimeContext();
    for (const system of [...this.#systems].reverse()) {
      system.unmount?.(runtimeContext);
    }
    for (const ownerId of this.#previewNodes.keys()) {
      this.#unmountPreviewNode(ownerId);
    }
    this.#crdtManager.destroy();
    this.#cleanupSelectionSubscription?.();
    this.#cleanupCameraSubscription?.();
    this.#resizeObserver.disconnect();
    this.#inputManager.destroy();
    this.#transform.destroy();
    this.#stage.destroy();
    this.#overlayRoot.remove();
    this.#stageRoot.remove();
  }

  #activeTool = () => this.#temporaryTool() ?? this.#selectedTool();

  #renderGrid() {
    renderGrid({
      layer: this.#gridLayer,
      width: this.#stage.width(),
      height: this.#stage.height(),
      camera: this.#camera,
      visible: this.#gridVisible(),
    });
  }

  #runtimeContext(): TCanvasSystemRuntimeContext<TCanvasInputContext> {
    return {
      stage: this.#stage,
      data: this.#context,
      getPointerPosition: () => this.#stage.getPointerPosition(),
      requestDraw: () => this.#stage.batchDraw(),
    };
  }

  #redrawSystems() {
    this.#renderGrid();
    const runtimeContext = this.#runtimeContext();
    for (const system of this.#systems) {
      system.update?.(runtimeContext);
    }
  }

  #toInputSystem(system: AbstractCanvasSystem<TCanvasInputContext, unknown>): TInputSystem<TCanvasInputContext> {
    return {
      name: system.name,
      priority: system.priority,
      isEnabled: system.input.isEnabled,
      canStart: system.input.canStart,
      onStart: system.input.onStart,
      onMove: system.input.onMove,
      onEnd: system.input.onEnd,
      onCancel: system.input.onCancel,
      onWheel: system.input.onWheel,
      onKeyDown: system.input.onKeyDown,
      onKeyUp: system.input.onKeyUp,
      getCursor: system.input.getCursor,
    };
  }

  #mountPreviewNode(ownerId: string, node: Konva.Shape | Konva.Group) {
    const existingNode = this.#previewNodes.get(ownerId);
    if (existingNode === node) return;

    if (existingNode) {
      existingNode.remove();
      existingNode.destroy();
    }

    this.#previewNodes.set(ownerId, node);
    this.#worldOverlay.add(node);
    node.moveToTop();
    this.#worldOverlay.getLayer()?.batchDraw();
  }

  #unmountPreviewNode(ownerId: string) {
    const node = this.#previewNodes.get(ownerId);
    if (!node) return;

    this.#previewNodes.delete(ownerId);
    node.destroy();
    this.#worldOverlay.getLayer()?.batchDraw();
  }

  #createElement(draft: TCanvasElementDraft) {
    logCanvasDebug("[canvas-service] createElement", {
      type: draft.data.type,
      x: draft.x,
      y: draft.y,
    });
    this.#crdtManager.createElement(draft);
  }

  #registerStageSelectionEvents() {
    this.#stage.on("click tap", (event) => {
      if (this.#suppressNextClickSelection) {
        this.#suppressNextClickSelection = false;
        return;
      }

      if (this.#activeTool() !== "select") {
        return;
      }

      if (event.target === this.#stage) {
        this.#selection.clear();
        return;
      }

      if (this.#transform.isTransformerNode(event.target)) {
        return;
      }

      const selectableNode = this.#resolveSelectableNode(event.target);
      if (!selectableNode) {
        return;
      }

      const metaPressed = event.evt.shiftKey || event.evt.ctrlKey || event.evt.metaKey;
      const isSelected = this.#selection.isSelected(selectableNode.id());

      if (!metaPressed && !isSelected) {
        this.#selection.selectOnly(selectableNode.id());
        return;
      }

      if (metaPressed && isSelected) {
        this.#selection.setSelectedIds(this.#selection.getSelectedIds().filter((nodeId) => nodeId !== selectableNode.id()));
        return;
      }

      if (metaPressed && !isSelected) {
        this.#selection.setSelectedIds([...this.#selection.getSelectedIds(), selectableNode.id()]);
        return;
      }

      this.#selection.selectOnly(selectableNode.id());
    });
  }

  #getSelectableNodes() {
    return this.#worldShapes.find((node: Node) => Boolean(node.getAttr("vcSelectable")));
  }

  #resolveSelectableNode(target: Konva.Node | null | undefined) {
    let currentNode = target ?? null;

    while (currentNode) {
      if (currentNode === this.#stage) return null;

      if (this.#transform.isTransformerNode(currentNode)) {
        return null;
      }

      if (currentNode.id() && currentNode.getAttr("vcSelectable")) {
        return currentNode;
      }

      currentNode = currentNode.getParent();
    }

    return null;
  }

  #getTransformableNodes() {
    return this.#selection
      .getSelectedIds()
      .map((nodeId) => this.#worldShapes.findOne(`#${nodeId}`))
      .filter((node): node is Konva.Node => Boolean(node && node.getAttr("vcTransformable")));
  }

  #syncTransformer() {
    if (this.#activeTool() !== "select") {
      this.#transform.clear();
      return;
    }

    this.#transform.setNodes(this.#getTransformableNodes());
  }

  #syncSelectionToScene() {
    const selectableNodes = this.#getSelectableNodes();
    this.#selection.pruneSelectedIds(selectableNodes.map((node) => node.id()));
    this.#applySelectionStyles();
    this.#syncTransformer();
  }

  #applySelectionStyles() {
    this.#stage.batchDraw();
  }
}

export type { TCanvasServiceArgs };
