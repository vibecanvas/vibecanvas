import type { IPlugin } from "@vibecanvas/runtime";
import type { RenderOrderService } from "../../new-services/render-order/RenderOrderService";
import type { IHooks } from "../../runtime";

export function createRenderOrderPlugin(): IPlugin<{
  renderOrder: RenderOrderService;
}, IHooks> {
  return {
    name: "render-order",
    apply(ctx) {
      const renderOrder = ctx.services.require("renderOrder");

      ctx.hooks.destroy.tap(() => {
        renderOrder.clearBundleResolvers();
      });
    },
  };
}
