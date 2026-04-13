import type { IPlugin } from "@vibecanvas/runtime";
import Square from "lucide-static/icons/square.svg?raw";
import type { CrdtService, EditorService, RenderOrderService, RenderService, SelectionService } from "../../new-services";
import type { IHooks } from "../../runtime";
import { txSetupExampleUi } from "./tx.setup";

const TOOL_ID = "example-ui";

function createCreateId(render: RenderService) {
  let fallbackId = 0;

  return () => {
    const cryptoApi = render.container.ownerDocument.defaultView?.crypto;
    if (cryptoApi?.randomUUID) {
      return cryptoApi.randomUUID();
    }

    fallbackId += 1;
    return `example-ui-${Date.now()}-${fallbackId}`;
  };
}

export function createExampleUiPlugin(): IPlugin<{
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

      txSetupExampleUi({
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
