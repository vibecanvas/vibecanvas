import type { TBackendCanvas } from "@/types/backend.types";
import { store } from "@/store";
import type { DocHandle } from "@automerge/automerge-repo";
import type { TCanvasDoc } from "@vibecanvas/shell/automerge/index";
import Konva from "konva";
import { createEffect, onCleanup, onMount } from "solid-js";
import { CameraSystem } from "../service/camera-system";
import { renderGrid } from "../service/grid-renderer";
import { InputManager } from "../service/input-manager";
import { createPanSystem } from "../service/pan-system";
import { createSelectBoxSystem } from "../service/select-box-system";
import { createZoomSystem } from "../service/zoom-system";
import type { TCanvasInputContext } from "../service/input-systems.types";

interface ICanvasProps {
  handle: DocHandle<TCanvasDoc>;
  data: TBackendCanvas;
}

export function Canvas(props: ICanvasProps) {
  let container!: HTMLDivElement;
  let stage: Konva.Stage | null = null;
  let inputManager: InputManager<TCanvasInputContext> | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let toolLabel: Konva.Text | null = null;
  let camera: CameraSystem | null = null;
  let gridLayer: Konva.Layer | null = null;
  let cleanupCameraSubscription: (() => void) | null = null;

  const selectableNodes: Konva.Shape[] = [];
  let selectedIds = new Set<string>();

  const applySelectionStyles = () => {
    for (const node of selectableNodes) {
      const isSelected = selectedIds.has(node.id());

      node.setAttrs({
        stroke: isSelected ? "#f59e0b" : "#0369a1",
        strokeWidth: isSelected ? 4 : 2,
        shadowBlur: isSelected ? 12 : 0,
        shadowColor: isSelected ? "#f59e0b" : undefined,
      });
    }

    stage?.batchDraw();
  };

  onMount(() => {
    props.handle;

    stage = new Konva.Stage({
      container,
      width: container.clientWidth || 1,
      height: container.clientHeight || 1,
    });

    gridLayer = new Konva.Layer();
    const shapesLayer = new Konva.Layer();
    const overlayLayer = new Konva.Layer();
    const hudLayer = new Konva.Layer();
    const worldShapes = new Konva.Group();
    const worldOverlay = new Konva.Group();
    const selectionRect = new Konva.Rect({
      visible: false,
      fill: "rgba(59, 130, 246, 0.12)",
      stroke: "#3b82f6",
      strokeWidth: 1,
      dash: [6, 4],
      listening: false,
    });
    toolLabel = new Konva.Text({
      x: 16,
      y: 16,
      text: `Tool: ${store.activeTool}`,
      fontSize: 14,
      fontFamily: "monospace",
      fill: "#475569",
      listening: false,
    });

    worldOverlay.add(selectionRect);
    shapesLayer.add(worldShapes);
    overlayLayer.add(worldOverlay);
    hudLayer.add(toolLabel);
    stage.add(gridLayer, shapesLayer, overlayLayer, hudLayer);

    camera = new CameraSystem();
    camera.registerTarget(worldShapes);
    camera.registerTarget(worldOverlay);
    cleanupCameraSubscription = camera.onChange(() => {
      renderGrid({
        layer: gridLayer,
        width: stage?.width() ?? 0,
        height: stage?.height() ?? 0,
        camera,
        visible: store.gridVisible,
      });
    });

    inputManager = new InputManager<TCanvasInputContext>({
      stage,
      context: {
        camera,
        getActiveTool: () => store.activeTool,
        overlayLayer,
        selectionRect,
        getSelectableNodes: () => selectableNodes,
        setSelectedIds: (ids) => {
          selectedIds = new Set(ids);
          applySelectionStyles();
        },
      },
      defaultCursor: "default",
    });

    inputManager.registerSystem(createZoomSystem());
    inputManager.registerSystem(createSelectBoxSystem());
    inputManager.registerSystem(createPanSystem());

    resizeObserver = new ResizeObserver(() => {
      if (!stage) return;

      stage.size({
        width: container.clientWidth || 1,
        height: container.clientHeight || 1,
      });
      renderGrid({
        layer: gridLayer,
        width: stage.width(),
        height: stage.height(),
        camera: camera!,
        visible: store.gridVisible,
      });
      stage.batchDraw();
    });

    resizeObserver.observe(container);
    renderGrid({
      layer: gridLayer,
      width: stage.width(),
      height: stage.height(),
      camera,
      visible: store.gridVisible,
    });
    applySelectionStyles();
  });

  createEffect(() => {
    if (!stage || !toolLabel || !camera) return;

    const activeTool = store.activeTool;

    toolLabel.text(`Tool: ${activeTool}`);
    toolLabel.getLayer()?.batchDraw();

    inputManager?.patchContext({
      camera,
      getActiveTool: () => activeTool,
    });
  });

  createEffect(() => {
    if (!stage || !camera) return;

      renderGrid({
        layer: gridLayer,
        width: stage.width(),
        height: stage.height(),
        camera,
      visible: store.gridVisible,
    });
  });


  onCleanup(() => {
    cleanupCameraSubscription?.();
    resizeObserver?.disconnect();
    inputManager?.destroy();
    stage?.destroy();
  });

  return <div ref={container} class="size-full" />;
}
