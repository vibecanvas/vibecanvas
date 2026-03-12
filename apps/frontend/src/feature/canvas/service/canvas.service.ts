import Konva from "konva";
import { CameraSystem } from "../managers/camera.manager";
import { InputManager, type TInputSystem } from "../managers/input.manager";
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
  activeTool: TCanvasInputContext["getActiveTool"] extends () => infer T ? T : never;
  gridVisible: boolean;
  onActiveTool: TCanvasInputContext["setActiveTool"];
  onToggleGrid: TCanvasInputContext["toggleGridVisible"];
  onToggleSidebar: TCanvasInputContext["toggleSidebarVisible"];
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
  #gridLayer: Konva.Layer;
  #worldShapes: Konva.Group;
  #worldOverlay: Konva.Group;
  #toolLabel: Konva.Text;
  #selectionRect: Konva.Rect;
  #strokePreviewPath: Konva.Path;
  #cleanupCameraSubscription: (() => void) | null = null;
  #selectableNodes: Konva.Shape[] = [];
  #selectedIds = new Set<string>();
  #systems: AbstractCanvasSystem<TCanvasInputContext, unknown>[] = [];
  #context: TCanvasInputContext;
  #activeTool: TCanvasServiceArgs["activeTool"];
  #gridVisible: boolean;

  constructor(args: TCanvasServiceArgs) {
    this.#activeTool = args.activeTool;
    this.#gridVisible = args.gridVisible;

    logCanvasDebug("[canvas-service] mounted", {
      activeTool: this.#activeTool,
      gridVisible: this.#gridVisible,
    });

    this.#stage = new Konva.Stage({
      container: args.container,
      width: args.container.clientWidth || 1,
      height: args.container.clientHeight || 1,
    });

    this.#gridLayer = new Konva.Layer();
    const shapesLayer = new Konva.Layer();
    const overlayLayer = new Konva.Layer();
    const hudLayer = new Konva.Layer();

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
    this.#toolLabel = new Konva.Text({
      x: 16,
      y: 16,
      text: `Tool: ${this.#activeTool}`,
      fontSize: 14,
      fontFamily: "monospace",
      fill: "#475569",
      listening: false,
    });

    this.#worldOverlay.add(this.#strokePreviewPath);
    this.#worldOverlay.add(this.#selectionRect);
    shapesLayer.add(this.#worldShapes);
    overlayLayer.add(this.#worldOverlay);
    hudLayer.add(this.#toolLabel);
    this.#stage.add(this.#gridLayer, shapesLayer, overlayLayer, hudLayer);

    this.#camera = new CameraSystem();
    this.#camera.registerTarget(this.#worldShapes);
    this.#camera.registerTarget(this.#worldOverlay);
    this.#cleanupCameraSubscription = this.#camera.onChange(() => {
      this.#redrawSystems();
    });

    this.#context = {
      camera: this.#camera,
      getActiveTool: () => this.#activeTool,
      setActiveTool: args.onActiveTool,
      toggleGridVisible: args.onToggleGrid,
      toggleSidebarVisible: args.onToggleSidebar,
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
        const data = getStrokePath(points);
        logCanvasDebug("[canvas-service] commitStroke", {
          pointsLength: points.length,
          dataLength: data.length,
        });

        if (!data) {
          this.#clearStrokePreview();
          return;
        }

        const strokeNode = new Konva.Path({
          id: `stroke-${crypto.randomUUID()}`,
          data,
          fill: "#0f172a",
          opacity: 0.92,
        });

        this.#worldShapes.add(strokeNode);
        this.#selectableNodes.push(strokeNode);
        this.#clearStrokePreview();
        this.#applySelectionStyles();
        this.#worldShapes.getLayer()?.batchDraw();
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
        width: args.container.clientWidth || 1,
        height: args.container.clientHeight || 1,
      });
      this.#redrawSystems();
      this.#stage.batchDraw();
    });

    this.#resizeObserver.observe(args.container);
    this.#redrawSystems();
    this.#applySelectionStyles();
  }

  setActiveTool(activeTool: TCanvasServiceArgs["activeTool"]) {
    this.#activeTool = activeTool;
    this.#toolLabel.text(`Tool: ${activeTool}`);
    this.#toolLabel.getLayer()?.batchDraw();
    this.#inputManager.patchContext({
      camera: this.#camera,
      getActiveTool: () => this.#activeTool,
    });
    this.#redrawSystems();
  }

  setGridVisible(gridVisible: boolean) {
    this.#gridVisible = gridVisible;
    this.#redrawSystems();
  }

  destroy() {
    const runtimeContext = this.#runtimeContext();
    for (const system of [...this.#systems].reverse()) {
      system.drawing.unmount?.(runtimeContext);
    }
    this.#cleanupCameraSubscription?.();
    this.#resizeObserver.disconnect();
    this.#inputManager.destroy();
    this.#stage.destroy();
  }

  #renderGrid() {
    renderGrid({
      layer: this.#gridLayer,
      width: this.#stage.width(),
      height: this.#stage.height(),
      camera: this.#camera,
      visible: this.#gridVisible,
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

      node.setAttrs({
        stroke: isSelected ? "#f59e0b" : "#0369a1",
        strokeWidth: isSelected ? 4 : 2,
        shadowBlur: isSelected ? 12 : 0,
        shadowColor: isSelected ? "#f59e0b" : undefined,
      });
    }

    this.#stage.batchDraw();
  }
}

export type { TCanvasServiceArgs };
