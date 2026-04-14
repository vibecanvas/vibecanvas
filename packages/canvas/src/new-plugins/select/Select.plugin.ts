import type { IPlugin } from "@vibecanvas/runtime";
import type { ThemeService } from "@vibecanvas/service-theme";
import Konva from "konva";
import type { Node } from "konva/lib/Node";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { RenderOrderService } from "../../new-services/render-order/RenderOrderService";
import type { SceneService } from "../../new-services/scene/SceneService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import type { IHooks } from "../../runtime";
import { CanvasMode } from "../../new-services/selection/CONSTANTS";
import { txDeleteSelection } from "./tx.delete-selection";
import { txHandleElementPointerDoubleClick } from "./tx.handle-element-pointer-double-click";
import { txHandleElementPointerDown } from "./tx.handle-element-pointer-down";
import { txHandleStagePointerMove } from "./tx.handle-stage-pointer-move";

function hasSameSelectionOrder(
  currentSelection: Array<{ id(): string }>,
  nextSelection: Array<{ id(): string }>,
) {
  if (currentSelection.length !== nextSelection.length) {
    return false;
  }

  return currentSelection.every((node, index) => node.id() === nextSelection[index]?.id());
}

function getSelectionLayerPointerPosition(render: SceneService) {
  return render.dynamicLayer.getRelativePointerPosition();
}

function isEditableTarget(target: EventTarget | null) {
  if (target instanceof HTMLInputElement) {
    return true;
  }

  if (target instanceof HTMLTextAreaElement) {
    return true;
  }

  if (target instanceof HTMLElement && target.isContentEditable) {
    return true;
  }

  return false;
}

function txHandleStagePointerDown(args: {
  scene: SceneService;
  selection: SelectionService;
  selectionRectangle: Konva.Rect;
  event: { target: Node };
}) {
  if (args.selection.isSelectionHandlingSuppressed()) {
    return;
  }

  const pointer = getSelectionLayerPointerPosition(args.scene);
  if (!pointer) {
    return;
  }

  if (args.event.target !== args.scene.stage) {
    return;
  }

  args.selectionRectangle.visible(true);
  args.selectionRectangle.position(pointer);
  args.selectionRectangle.size({ width: 0, height: 0 });
  args.selectionRectangle.moveToTop();
  args.selection.clear();
}


/**
 * Owns selection rules for click, drill-down, and marquee selection.
 * Uses SelectionService as the shared runtime state.
 */
export function createSelectPlugin(): IPlugin<{
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  scene: SceneService;
  renderOrder: RenderOrderService;
  selection: SelectionService;
  theme: ThemeService;
}, IHooks> {
  return {
    name: "select",
    apply(ctx) {
      const crdt = ctx.services.require("crdt");
      const editor = ctx.services.require("editor");
      const history = ctx.services.require("history");
      const render = ctx.services.require("scene");
      const renderOrder = ctx.services.require("renderOrder");
      const selection = ctx.services.require("selection");
      const theme = ctx.services.require("theme");
      const selectionRectangle = new Konva.Rect({
        visible: false,
        strokeWidth: 1,
        dash: [6, 4],
        listening: false,
      });

      const syncSelectionRectangleTheme = () => {
        const activeTheme = theme.getTheme();
        selectionRectangle.fill(activeTheme.colors.canvasSelectionFill);
        selectionRectangle.stroke(activeTheme.colors.canvasSelectionStroke);
      };

      ctx.hooks.init.tap(() => {
        syncSelectionRectangleTheme();
        render.dynamicLayer.add(selectionRectangle);
      });

      theme.hooks.change.tap(() => {
        syncSelectionRectangleTheme();
        render.dynamicLayer.batchDraw();
      });

      ctx.hooks.elementPointerDown.tap((event) => {
        if (selection.mode !== CanvasMode.SELECT) {
          return false;
        }

        if (selection.isSelectionHandlingSuppressed()) {
          return true;
        }

        return txHandleElementPointerDown({ editor, render, selection, hasSameSelectionOrder }, { event });
      });

      ctx.hooks.elementPointerDoubleClick.tap((event) => {
        if (selection.mode !== CanvasMode.SELECT) {
          return false;
        }

        if (selection.isSelectionHandlingSuppressed()) {
          return true;
        }

        return txHandleElementPointerDoubleClick({ editor, render, selection, hasSameSelectionOrder }, { event });
      });

      ctx.hooks.pointerDown.tap((event) => {
        if (selection.mode !== CanvasMode.SELECT) {
          return;
        }

        if (selection.isSelectionHandlingSuppressed()) {
          return;
        }

        txHandleStagePointerDown({
          scene: render,
          selection,
          selectionRectangle,
          event,
        });
      });

      ctx.hooks.pointerMove.tap((event) => {
        if (selection.mode !== CanvasMode.SELECT) {
          return;
        }

        if (!selectionRectangle.visible()) {
          return;
        }

        txHandleStagePointerMove(
          {
            Group: Konva.Group,
            Shape: Konva.Shape,
            Util: Konva.Util,
            render,
            selection,
            selectionRectangle,
            hasSameSelectionOrder,
          },
          { pointer: getSelectionLayerPointerPosition(render) },
        );
      });

      ctx.hooks.pointerUp.tap(() => {
        if (selection.mode !== CanvasMode.SELECT) {
          return;
        }

        selectionRectangle.visible(false);
      });

      ctx.hooks.keydown.tap((event) => {
        if (selection.mode !== CanvasMode.SELECT) {
          return;
        }

        if (selection.selection.length === 0) {
          return;
        }

        if (event.key !== "Backspace" && event.key !== "Delete") {
          return;
        }

        if (isEditableTarget(event.target)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        txDeleteSelection({ crdt, editor, history, render, renderOrder, selection }, {});
      });
    },
  };
}
