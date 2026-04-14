import type { IPlugin } from "@vibecanvas/runtime";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import Konva from "konva";
import Pencil from "lucide-static/icons/pencil.svg?raw";
import type { ContextMenuService } from "../../services/context-menu/ContextMenuService";
import type { CrdtService } from "../../services/crdt/CrdtService";
import type { EditorService } from "../../services/editor/EditorService";
import type { HistoryService } from "../../services/history/HistoryService";
import type { RenderOrderService } from "../../services/render-order/RenderOrderService";
import type { SceneService } from "../../services/scene/SceneService";
import type { SelectionService } from "../../services/selection/SelectionService";
import { resolveThemeColor, type ThemeService } from "@vibecanvas/service-theme";
import { getStroke } from "perfect-freehand";
import { throttle } from "@solid-primitives/scheduled";
import { CanvasMode } from "../../services/selection/CONSTANTS";
import type { IHooks } from "../../runtime";
import { fxFilterSelection } from "../../core/fx.filter-selection";
import { fxGetWorldPositionFromNode } from "../../core/fx.node-space";
import { txDeleteSelection } from "../select/tx.delete-selection";
import { DEFAULT_FILL, DEFAULT_OPACITY, DEFAULT_STROKE_WIDTH } from "./CONSTANTS";
import { txCreatePenCloneDrag, txCreatePenPreviewClone, txFinalizePenPreviewClone } from "./tx.clone";
import { fxIsPenPath, fxPenPathToElement } from "./fx.path";
import { fxCreatePenDataFromStrokePoints, type TStrokePoint } from "./fn.math";
import { txSetupPenShapeListeners, txSafeStopPenDrag } from "./tx.listeners";
import { txCreatePenPathFromElement, txUpdatePenPathFromElement } from "./tx.path";
import { EditorServiceV2 } from "src/services/editor/EditorServiceV2";

function getPointerPoint(render: SceneService, event?: MouseEvent | TouchEvent | PointerEvent): TStrokePoint | null {
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

function createCreateId(render: SceneService) {
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
  editor2: EditorServiceV2;
  history: HistoryService;
  scene: SceneService;
  renderOrder: RenderOrderService;
  selection: SelectionService;
  theme: ThemeService;
}, IHooks> {
  return {
    name: "pen",
    apply(ctx) {
      const contextMenu = ctx.services.require("contextMenu");
      const crdt = ctx.services.require("crdt");
      const editor = ctx.services.require("editor2");
      const history = ctx.services.require("history");
      const render = ctx.services.require("scene");
      const renderOrder = ctx.services.require("renderOrder");
      const selection = ctx.services.require("selection");
      const theme = ctx.services.require("theme");
      const createId = createCreateId(render);
      const now = () => Date.now();


      ctx.hooks.init.tap(() => {
        editor.registerTool({
          id: "pen",
          label: "Pen",
          icon: Pencil,
          behavior: { type: "mode", mode: 'draw-create'  },
          shortcuts: ['p']
        })
      })

      ctx.hooks.destroy.tap(() => {
        editor.unregisterTool("pen")
      });

    }
  };
}
