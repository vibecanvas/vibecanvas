import type { IPlugin } from "@vibecanvas/runtime";
import icon from "lucide-static/icons/pickaxe.svg?raw";
import { html } from "@arrow-js/core";
import { render as renderArrowView } from "@arrow-js/framework";
import { sandbox as createArrowSandbox } from "@arrow-js/sandbox";
import { HOSTED_COMPONENT_TOOL_ID } from "./old/CONSTANTS";
import type { CameraService, CrdtService, EditorService, RenderOrderService, SceneService, SelectionService, WidgetService } from "../../services";
import type { IHooks } from "../../runtime";
import { txSetupHostedComponent } from "./old/tx.setup";
import { setupExampleTool } from "./example-tool";

function createCreateId(render: SceneService) {
  let fallbackId = 0;

  return () => {
    const cryptoApi = render.container.ownerDocument.defaultView?.crypto;
    if (cryptoApi?.randomUUID) {
      return cryptoApi.randomUUID();
    }

    fallbackId += 1;
    return `${HOSTED_COMPONENT_TOOL_ID}-${Date.now()}-${fallbackId}`;
  };
}

export function createHostedComponentPlugin(): IPlugin<{
  camera: CameraService;
  crdt: CrdtService;
  scene: SceneService;
  renderOrder: RenderOrderService;
  editor: EditorService;
  selection: SelectionService;
  widget: WidgetService;
}, IHooks> {
  return {
    name: HOSTED_COMPONENT_TOOL_ID,
    apply(ctx) {
      const render = ctx.services.require("scene");
      const camera = ctx.services.require("camera");
      const crdt = ctx.services.require("crdt");
      const editor = ctx.services.require("editor");
      const renderOrder = ctx.services.require("renderOrder");
      const selection = ctx.services.require("selection");
      const widget = ctx.services.require("widget");

      ctx.hooks.init.tap(() => {
        setupExampleTool(widget)
      })

      // txSetupHostedComponent({
      //   camera: ctx.services.require("camera"),
      //   crdt: ctx.services.require("crdt"),
      //   editor: ctx.services.require("editor"),
      //   hooks: ctx.hooks,
      //   icon,
      //   now: () => Date.now(),
      //   createId: createCreateId(render),
      //   render,
      //   arrow: {
      //     html,
      //     render: renderArrowView,
      //     sandbox: createArrowSandbox,
      //   },
      //   renderOrder: ctx.services.require("renderOrder"),
      //   selection: ctx.services.require("selection"),
      // }, {});
    },
  };
}
