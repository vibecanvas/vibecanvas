import type { IPlugin } from "@vibecanvas/runtime";
import type { ContextMenuService } from "../../services/context-menu/ContextMenuService";
import type { RenderOrderService } from "../../services/render-order/RenderOrderService";
import type { IRuntimeHooks } from "../../types";

function hasSameParent(selection: Parameters<RenderOrderService["bringSelectionToFront"]>[0]) {
  return selection.length <= 1 || selection.every((node) => node.getParent() === selection[0]?.getParent());
}

export function createRenderOrderPlugin(): IPlugin<{
  contextMenu: ContextMenuService;
  renderOrder: RenderOrderService;
}, IRuntimeHooks> {
  return {
    name: "render-order",
    apply(ctx) {
      const contextMenu = ctx.services.require("contextMenu");
      const renderOrder = ctx.services.require("renderOrder");

      contextMenu.registerProvider("render-order", ({ scope, activeSelection }) => {
        if (scope === "canvas") {
          return [];
        }

        const disabled = activeSelection.length === 0 || !hasSameParent(activeSelection);
        return [
          {
            id: "render-order-bring-to-front",
            label: "Bring to front",
            disabled,
            priority: 100,
            onSelect: () => {
              renderOrder.bringSelectionToFront(activeSelection);
            },
          },
          {
            id: "render-order-move-forward",
            label: "Move forward",
            disabled,
            priority: 110,
            onSelect: () => {
              renderOrder.moveSelectionUp(activeSelection);
            },
          },
          {
            id: "render-order-move-backward",
            label: "Move backward",
            disabled,
            priority: 120,
            onSelect: () => {
              renderOrder.moveSelectionDown(activeSelection);
            },
          },
          {
            id: "render-order-send-to-back",
            label: "Send to back",
            disabled,
            priority: 130,
            onSelect: () => {
              renderOrder.sendSelectionToBack(activeSelection);
            },
          },
        ];
      });

      ctx.hooks.destroy.tap(() => {
        contextMenu.unregisterProvider("render-order");
        renderOrder.clearBundleResolvers();
      });
    },
  };
}
