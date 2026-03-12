import Konva from "konva";
import type { DocHandle } from "@automerge/automerge-repo";
import type { TCanvasDoc } from "@vibecanvas/shell/automerge/index";
import { createSignal, type Accessor, type Setter } from "solid-js";
import { CameraSystem } from "../managers/camera.manager";
import { CrdtManager } from "../managers/crdt.manager";
import { InputManager, type TInputSystem } from "../managers/input.manager";
import type { TTool } from "../components/toolbar.types";
import { PanSystem } from "../systems/pan.system";
import { PenSystem } from "../systems/pen.system";
import { SelectBoxSystem } from "../systems/select-box.system";
import { AbstractCanvasSystem, type TCanvasSystemRuntimeContext } from "../systems/system.abstract";
import { ToolSystem } from "../systems/tool.system";
import { ZoomSystem } from "../systems/zoom.system";
import { logCanvasDebug } from "../utils/canvas-debug";
import { renderGrid } from "../utils/grid-renderer";
import { getStrokePath, type TStrokePoint } from "../utils/stroke-renderer";
import type { TCanvasInputContext } from "../types/canvas-context.types";

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
  #selectionRect: Konva.Rect;
  #strokePreviewPath: Konva.Path;
  #cleanupCameraSubscription: (() => void) | null = null;
  #crdtManager: CrdtManager;
  #selectableNodes: Konva.Shape[] = [];
  #selectedIds = new Set<string>();
  #systems: AbstractCanvasSystem<TCanvasInputContext, unknown>[] = [];
  #context: TCanvasInputContext;
  #selectedTool: Accessor<TTool>;
  #setSelectedToolSignal: Setter<TTool>;
  #temporaryTool: Accessor<TTool | null>;
  #setTemporaryToolSignal: Setter<TTool | null>;
  #gridVisible: Accessor<boolean>;
  #setGridVisibleSignal: Setter<boolean>;

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
    this.#strokePreviewPath = new Konva.Path({
      data: "",
      fill: "#0f172a",
      opacity: 0.92,
      visible: false,
      listening: false,
    });
    this.#selectionRect = new Konva.Rect({
      visible: false,
      fill: "rgba(59, 130, 246, 0.12)",
      stroke: "#3b82f6",
      strokeWidth: 1,
      dash: [6, 4],
      listening: false,
    });

    this.#worldOverlay.add(this.#strokePreviewPath);
    this.#worldOverlay.add(this.#selectionRect);
    shapesLayer.add(this.#worldShapes);
    overlayLayer.add(this.#worldOverlay);
    this.#stage.add(this.#gridLayer, shapesLayer, overlayLayer);

    this.#camera = new CameraSystem();
    this.#camera.registerTarget(this.#worldShapes);
    this.#camera.registerTarget(this.#worldOverlay);
    this.#cleanupCameraSubscription = this.#camera.onChange(() => {
      this.#redrawSystems();
    });

    this.#context = {
      camera: this.#camera,
      overlayRoot: this.#overlayRoot,
      getActiveTool: this.#activeTool,
      setActiveTool: (tool) => {
        this.#setSelectedToolSignal(tool);
        this.#setTemporaryToolSignal(null);
      },
      setTemporaryTool: (tool) => {
        this.#setTemporaryToolSignal(tool);
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
      overlayLayer,
      selectionRect: this.#selectionRect,
      getSelectableNodes: () => this.#selectableNodes,
      setSelectedIds: (ids) => {
        this.#selectedIds = new Set(ids);
        this.#applySelectionStyles();
      },
      beginStrokePreview: (point) => {
        logCanvasDebug("[canvas-service] beginStrokePreview", { point });
        this.#syncStrokePath(this.#strokePreviewPath, [point, { ...point, x: point.x + 0.01, y: point.y + 0.01 }]);
        this.#strokePreviewPath.getLayer()?.batchDraw();
      },
      updateStrokePreview: (points) => {
        logCanvasDebug("[canvas-service] updateStrokePreview", {
          pointsLength: points.length,
        });
        this.#syncStrokePath(this.#strokePreviewPath, points);
        this.#strokePreviewPath.getLayer()?.batchDraw();
      },
      commitStroke: (points) => {
        logCanvasDebug("[canvas-service] commitStroke", {
          pointsLength: points.length,
        });
        this.#crdtManager.commitPenStroke(points);
        this.#clearStrokePreview();
        this.#worldOverlay.getLayer()?.batchDraw();
      },
      cancelStrokePreview: () => {
        logCanvasDebug("[canvas-service] cancelStrokePreview");
        this.#clearStrokePreview();
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
      addSelectableNode: (node) => {
        if (this.#selectableNodes.some((existingNode) => existingNode.id() === node.id())) return;
        this.#selectableNodes.push(node);
      },
      removeSelectableNode: (nodeId) => {
        this.#selectableNodes = this.#selectableNodes.filter((node) => node.id() !== nodeId);
      },
      syncSelectionStyles: () => {
        this.#applySelectionStyles();
      },
    });
    this.#crdtManager.mount();

    this.#systems = [
      new ZoomSystem(),
      new SelectBoxSystem(),
      new PenSystem(),
      new PanSystem(),
      new ToolSystem(),
    ];

    for (const system of this.#systems) {
      this.#inputManager.registerSystem(this.#toInputSystem(system));
      system.drawing.mount?.(this.#runtimeContext());
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
    this.#applySelectionStyles();
  }

  destroy() {
    const runtimeContext = this.#runtimeContext();
    for (const system of [...this.#systems].reverse()) {
      system.drawing.unmount?.(runtimeContext);
    }
    this.#crdtManager.destroy();
    this.#cleanupCameraSubscription?.();
    this.#resizeObserver.disconnect();
    this.#inputManager.destroy();
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
      system.drawing.redraw?.(runtimeContext);
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

  #syncStrokePath(pathNode: Konva.Path, points: TStrokePoint[]) {
    const data = getStrokePath(points);

    logCanvasDebug("[canvas-service] syncStrokePath", {
      pointsLength: points.length,
      dataLength: data.length,
    });

    pathNode.data(data);
    pathNode.visible(Boolean(data));
  }

  #clearStrokePreview() {
    this.#strokePreviewPath.hide();
    this.#strokePreviewPath.data("");
    this.#strokePreviewPath.getLayer()?.batchDraw();
  }

  #applySelectionStyles() {
    for (const node of this.#selectableNodes) {
      const isSelected = this.#selectedIds.has(node.id());

      if (isSelected) {
        node.setAttrs({
          stroke: "#f59e0b",
          strokeWidth: 4,
          shadowBlur: 12,
          shadowColor: "#f59e0b",
        });
      } else {
        node.setAttrs({
          stroke: null,
          strokeWidth: 0,
          shadowBlur: 0,
          shadowColor: undefined,
        });
      }
    }

    this.#stage.batchDraw();
  }
}

export type { TCanvasServiceArgs };
