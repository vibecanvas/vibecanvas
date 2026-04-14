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
import type { TEditorToolCanvasPoint } from "src/services/editor/EditorServiceV2";
import { txSetupPenShapeListeners, txSafeStopPenDrag } from "./tx.listeners";
import { txUpdatePenPathFromElement } from "./tx.path";
import { EditorServiceV2 } from "src/services/editor/EditorServiceV2";
import { CanvasRegistryService } from "../../services";
import { fxCreatePenNode } from "./fx.create-node";

const DRAFT_POINTS_ATTR = "vcDraftStrokePoints";

function createDraftElement(args: {
  id: string;
  now: number;
  points: TEditorToolCanvasPoint[];
}): TElement {
  const penData = fxCreatePenDataFromStrokePoints({
    points: args.points,
  });
  if (!penData) {
    throw new Error("Failed to create pen draft data");
  }

  return {
    id: args.id,
    x: penData.x,
    y: penData.y,
    rotation: 0,
    zIndex: "",
    parentGroupId: null,
    bindings: [],
    locked: false,
    createdAt: args.now,
    updatedAt: args.now,
    data: penData,
    style: {
      backgroundColor: "black",
    },
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
  canvasRegistry: CanvasRegistryService;
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
      const now = () => Date.now();
      const canvasRegistry = ctx.services.require("canvasRegistry");

      canvasRegistry.registerElement({
        id: "pen",
        matchesElement: (element) => element.data.type === "pen",
        createNode: (element) => {
          return fxCreatePenNode({
            Path: Konva.Path,
            theme,
            getStroke,
            resolveThemeColor,
          }, {
            element,
          });
        },
      })

      ctx.hooks.init.tap(() => {
        editor.registerTool(ctx, {
          id: "pen",
          label: "Pen",
          icon: Pencil,
          behavior: { type: "mode", mode: 'draw-create'  },
          shortcuts: ['p'],
          drawCreate: {
            startDraft: (args) => {
              const node = fxCreatePenNode({
                Path: Konva.Path,
                theme,
                getStroke,
                resolveThemeColor,
              }, {
                element: createDraftElement({
                  id: "pen-draft",
                  now: now(),
                  points: [args.point],
                }),
              });

              if (!node) {
                throw new Error("Failed to create pen node");
              }

              node.setAttr(DRAFT_POINTS_ATTR, [args.point]);
              node.listening(false);
              node.draggable(false);
              return node;
            },
            updateDraft: (previewNode, args) => {
              if (!(previewNode instanceof Konva.Path)) {
                return;
              }

              const points = [
                ...((previewNode.getAttr(DRAFT_POINTS_ATTR) as TEditorToolCanvasPoint[] | undefined) ?? []),
                args.point,
              ];
              previewNode.setAttr(DRAFT_POINTS_ATTR, points);

              txUpdatePenPathFromElement({
                Path: Konva.Path,
                theme,
                getStroke,
                resolveThemeColor,
              }, {
                node: previewNode,
                element: createDraftElement({
                  id: previewNode.id(),
                  now: args.now,
                  points,
                }),
              });
              previewNode.listening(false);
              previewNode.draggable(false);
            },
          }
        })
      })

      ctx.hooks.destroy.tap(() => {
        editor.unregisterTool("pen")
      });

    }
  };
}
