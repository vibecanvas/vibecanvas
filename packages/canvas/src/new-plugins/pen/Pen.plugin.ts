import type { IPlugin } from "@vibecanvas/runtime";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import Pencil from "lucide-static/icons/pencil.svg?raw";
import type { ContextMenuService } from "../../new-services/context-menu/ContextMenuService";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { RenderOrderService } from "../../new-services/render-order/RenderOrderService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import { resolveThemeColor, type ThemeService } from "@vibecanvas/service-theme";
import { getStroke } from "perfect-freehand";
import { throttle } from "@solid-primitives/scheduled";
import { CanvasMode } from "../../new-services/selection/CONSTANTS";
import type { IHooks } from "../../runtime";
import { fxFilterSelection } from "../../core/fn.filter-selection";
import { getWorldPosition } from "../../core/node-space";
import { txDeleteSelection } from "../select/tx.delete-selection";
import { DEFAULT_FILL, DEFAULT_OPACITY, DEFAULT_STROKE_WIDTH } from "./CONSTANTS";
import { txCreatePenCloneDrag, txCreatePenPreviewClone, txFinalizePenPreviewClone } from "./tx.clone";
import { fxIsPenPath, fxPenPathToElement } from "./fx.path";
import { fxCreatePenDataFromStrokePoints, type TStrokePoint } from "./fn.math";
import { txSetupPenShapeListeners, txSafeStopPenDrag } from "./tx.listeners";
import { txCreatePenPathFromElement, txUpdatePenPathFromElement } from "./tx.path";

function getPointerPoint(render: RenderService, event?: MouseEvent | TouchEvent | PointerEvent): TStrokePoint | null {
  const pointer = render.dynamicLayer.getRelativePointerPosition();
  if (!pointer) {
    return null;
  }

  const pressure = typeof event === "object"
    && event !== null
    && "pressure" in event
    && typeof event.pressure === "number"
    && Number.isFinite(event.pressure)
    && event.pressure > 0
      ? event.pressure
      : 0.5;

  return {
    x: pointer.x,
    y: pointer.y,
    pressure,
  };
}

function createCreateId(render: RenderService) {
  let fallbackId = 0;

  return () => {
    const cryptoApi = render.container.ownerDocument.defaultView?.crypto;
    if (cryptoApi?.randomUUID) {
      return cryptoApi.randomUUID();
    }

    fallbackId += 1;
    return `pen-${Date.now()}-${fallbackId}`;
  };
}

/**
 * Owns pen draw-create flow, pen node hydration, drag, and clone wiring.
 * Keeps pen tool state in EditorService and scene behavior in SelectionService.
 */
export function createPenPlugin(): IPlugin<{
  contextMenu: ContextMenuService;
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  render: RenderService;
  renderOrder: RenderOrderService;
  selection: SelectionService;
  theme: ThemeService;
}, IHooks> {
  return {
    name: "pen",
    apply(ctx) {
      const contextMenu = ctx.services.require("contextMenu");
      const crdt = ctx.services.require("crdt");
      const editor = ctx.services.require("editor");
      const history = ctx.services.require("history");
      const render = ctx.services.require("render");
      const renderOrder = ctx.services.require("renderOrder");
      const selection = ctx.services.require("selection");
      const theme = ctx.services.require("theme");
      const createId = createCreateId(render);
      const now = () => Date.now();

      let points: TStrokePoint[] = [];
      let previewPath: Konva.Path | null = null;
      let draftElementId: string | null = null;

      const toElement = (node: Konva.Path) => {
        return fxPenPathToElement({ editor, now }, { node });
      };

      const setupNode = (node: Konva.Path) => {
        txSetupPenShapeListeners({
          crdt,
          editor,
          history,
          render,
          selection,
          hooks: ctx.hooks,
          now,
          Path: render.Path,
          getWorldPosition: (sourceNode) => getWorldPosition(sourceNode),
          createThrottledPatch: (callback) => throttle(callback, 100),
          createPenCloneDrag: (sourceNode) => {
            return txCreatePenCloneDrag({
              crdt,
              render,
              renderOrder,
              selection,
              theme,
              createId,
              now,
              getStroke,
              resolveThemeColor,
              setupNode,
              toElement,
            }, { node: sourceNode });
          },
          createPenPreviewClone: (sourceNode) => {
            return txCreatePenPreviewClone({
              crdt,
              render,
              renderOrder,
              selection,
              theme,
              createId,
              now,
              getStroke,
              resolveThemeColor,
              setupNode,
              toElement,
            }, { node: sourceNode });
          },
          finalizePenPreviewClone: (previewNode) => {
            return txFinalizePenPreviewClone({
              crdt,
              render,
              renderOrder,
              selection,
              theme,
              createId,
              now,
              getStroke,
              resolveThemeColor,
              setupNode,
              toElement,
            }, { previewClone: previewNode });
          },
          filterSelection: (nodes) => {
            return fxFilterSelection({ render, editor, selection: nodes.filter((node): node is Konva.Group | Konva.Shape => {
              return node instanceof render.Group || node instanceof render.Shape;
            }) });
          },
          safeStopDrag: (sourceNode) => txSafeStopPenDrag({}, { node: sourceNode }),
          toElement,
        }, { node });

        node.setDraggable(true);
        node.listening(true);
        node.visible(true);
        return node;
      };

      const resetPreview = () => {
        points = [];
        draftElementId = null;
        if (!previewPath) {
          editor.setPreviewNode(null);
          return;
        }

        previewPath.destroy();
        previewPath = null;
        editor.setPreviewNode(null);
        render.dynamicLayer.batchDraw();
      };

      const createElementFromPoints = (): TElement | null => {
        const penData = fxCreatePenDataFromStrokePoints({ points });
        if (!penData) {
          return null;
        }

        const timestamp = now();
        return {
          id: draftElementId ?? createId(),
          x: penData.x,
          y: penData.y,
          rotation: 0,
          bindings: [],
          createdAt: timestamp,
          locked: false,
          parentGroupId: null,
          updatedAt: timestamp,
          zIndex: "",
          data: {
            type: "pen",
            points: penData.points,
            pressures: penData.pressures,
            simulatePressure: penData.simulatePressure,
          },
          style: {
            backgroundColor: DEFAULT_FILL,
            opacity: DEFAULT_OPACITY,
            strokeWidth: DEFAULT_STROKE_WIDTH,
          },
        } satisfies TElement;
      };

      const ensurePreviewPath = () => {
        if (previewPath) {
          return previewPath;
        }

        previewPath = new render.Path({
          data: "",
          fill: DEFAULT_FILL,
          opacity: DEFAULT_OPACITY,
          listening: false,
          visible: false,
          draggable: false,
        });
        render.dynamicLayer.add(previewPath);
        editor.setPreviewNode(previewPath);
        return previewPath;
      };

      const syncPreview = () => {
        const element = createElementFromPoints();
        if (!element) {
          resetPreview();
          return;
        }

        const node = ensurePreviewPath();
        txUpdatePenPathFromElement({
          render,
          theme,
          getStroke,
          resolveThemeColor,
        }, { node, element });
        node.listening(false);
        node.draggable(false);
        node.visible(true);
        render.dynamicLayer.batchDraw();
      };

      const cancelStroke = () => {
        resetPreview();
        editor.setActiveTool("select");
      };

      contextMenu.registerProvider("pen", ({ targetElement, activeSelection }) => {
        if (targetElement?.data.type !== "pen") {
          return [];
        }

        return [{
          id: "delete-pen-selection",
          label: "Delete",
          priority: 300,
          onSelect: () => {
            selection.setSelection(activeSelection);
            txDeleteSelection({ crdt, editor, history, render, renderOrder, selection }, {});
          },
        }];
      });

      editor.registerTool({
        id: "pen",
        label: "Pen",
        icon: Pencil,
        shortcuts: ["7", "p"],
        priority: 70,
        behavior: { type: "mode", mode: "draw-create" },
      });

      editor.registerToElement("pen", (node) => {
        if (!(node instanceof render.Path)) {
          return null;
        }

        if (!fxIsPenPath({}, { node })) {
          return null;
        }

        return toElement(node);
      });

      editor.registerCreateShapeFromTElement("pen", (element) => {
        if (element.data.type !== "pen") {
          return null;
        }

        return setupNode(txCreatePenPathFromElement({
          render,
          theme,
          getStroke,
          resolveThemeColor,
        }, { element }));
      });

      editor.registerSetupExistingShape("pen", (node) => {
        if (!(node instanceof render.Path)) {
          return false;
        }

        if (!fxIsPenPath({}, { node })) {
          return false;
        }

        setupNode(node);
        return true;
      });

      editor.registerUpdateShapeFromTElement("pen", (element) => {
        if (element.data.type !== "pen") {
          return false;
        }

        const node = render.staticForegroundLayer.findOne((candidate: Konva.Node) => {
          return candidate instanceof render.Path && candidate.id() === element.id;
        });
        if (!(node instanceof render.Path)) {
          return false;
        }

        return txUpdatePenPathFromElement({
          render,
          theme,
          getStroke,
          resolveThemeColor,
        }, { node, element });
      });

      ctx.hooks.toolSelect.tap((toolId) => {
        if (toolId === "pen") {
          return;
        }

        resetPreview();
      });

      ctx.hooks.pointerDown.tap((event) => {
        if (selection.mode !== CanvasMode.DRAW_CREATE) {
          return;
        }

        if (editor.activeToolId !== "pen") {
          return;
        }

        const point = getPointerPoint(render, event.evt);
        if (!point) {
          return;
        }

        points = [
          point,
          { ...point, x: point.x + 0.01, y: point.y + 0.01 },
        ];
        draftElementId = createId();
        syncPreview();
      });

      ctx.hooks.pointerMove.tap((event) => {
        if (selection.mode !== CanvasMode.DRAW_CREATE) {
          return;
        }

        if (editor.activeToolId !== "pen") {
          return;
        }

        if (points.length === 0) {
          return;
        }

        const point = getPointerPoint(render, event.evt);
        if (!point) {
          return;
        }

        const previousPoint = points[points.length - 1];
        if (previousPoint && previousPoint.x === point.x && previousPoint.y === point.y) {
          return;
        }

        points = [...points, point];
        syncPreview();
      });

      ctx.hooks.pointerUp.tap(() => {
        if (selection.mode !== CanvasMode.DRAW_CREATE) {
          return;
        }

        if (editor.activeToolId !== "pen") {
          return;
        }

        const element = createElementFromPoints();
        resetPreview();
        if (!element) {
          return;
        }

        const node = setupNode(txCreatePenPathFromElement({
          render,
          theme,
          getStroke,
          resolveThemeColor,
        }, { element }));
        render.staticForegroundLayer.add(node);
        renderOrder.assignOrderOnInsert({
          parent: render.staticForegroundLayer,
          nodes: [node],
          position: "front",
        });
        crdt.patch({ elements: [toElement(node)], groups: [] });
        render.staticForegroundLayer.batchDraw();
      });

      ctx.hooks.pointerCancel.tap(() => {
        if (selection.mode !== CanvasMode.DRAW_CREATE) {
          return;
        }

        if (editor.activeToolId !== "pen") {
          return;
        }

        cancelStroke();
      });

      ctx.hooks.keydown.tap((event) => {
        if (event.key !== "Escape") {
          return;
        }

        if (selection.mode !== CanvasMode.DRAW_CREATE) {
          return;
        }

        if (editor.activeToolId !== "pen") {
          return;
        }

        if (!previewPath) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        cancelStroke();
      });

      theme.hooks.change.tap(() => {
        render.staticForegroundLayer.find((candidate: Konva.Node) => {
          return candidate instanceof render.Path && fxIsPenPath({}, { node: candidate });
        }).forEach((candidate) => {
          if (!(candidate instanceof render.Path)) {
            return;
          }

          const element = toElement(candidate);
          txUpdatePenPathFromElement({
            render,
            theme,
            getStroke,
            resolveThemeColor,
          }, { node: candidate, element });
        });
        render.staticForegroundLayer.batchDraw();
      });

      ctx.hooks.destroy.tap(() => {
        resetPreview();
        contextMenu.unregisterProvider("pen");
        editor.unregisterTool("pen");
        editor.unregisterToElement("pen");
        editor.unregisterCreateShapeFromTElement("pen");
        editor.unregisterSetupExistingShape("pen");
        editor.unregisterUpdateShapeFromTElement("pen");
      });
    },
  };
}
