import type { IPlugin } from "@vibecanvas/runtime";
import Square from "lucide-static/icons/square.svg?raw";
import type { CrdtService, EditorService, RenderOrderService, RenderService, SelectionService } from "../../new-services";
import type { IHooks } from "../../runtime";
import { txSetupHostedComponent } from "./tx.setup";

const TOOL_ID = "hosted-component";

function createCreateId(render: RenderService) {
  let fallbackId = 0;

  return () => {
    const cryptoApi = render.container.ownerDocument.defaultView?.crypto;
    if (cryptoApi?.randomUUID) {
      return cryptoApi.randomUUID();
    }

    fallbackId += 1;
    return `hosted-component-${Date.now()}-${fallbackId}`;
  };
}

export function createHostedComponentPlugin(): IPlugin<{
  crdt: CrdtService;
  render: RenderService;
  renderOrder: RenderOrderService;
  editor: EditorService;
  selection: SelectionService;
}, IHooks> {
  return {
    name: TOOL_ID,
    apply(ctx) {
      const render = ctx.services.require("render");

      txSetupHostedComponent({
        crdt: ctx.services.require("crdt"),
        editor: ctx.services.require("editor"),
        hooks: ctx.hooks,
        icon: Square,
        now: () => Date.now(),
        createId: createCreateId(render),
        render,
        renderOrder: ctx.services.require("renderOrder"),
        selection: ctx.services.require("selection"),
      }, {});
    },
  };
}
