import type { IPlugin } from "@vibecanvas/runtime";
import type { CameraService, CrdtService, EditorService, RenderOrderService, SceneService, SelectionService } from "../../services";
import type { IHooks } from "../../runtime";

const HOSTED_COMPONENT_PLUGIN_ID = "hosted-component";

export function createHostedComponentPlugin(): IPlugin<{
  camera: CameraService;
  crdt: CrdtService;
  scene: SceneService;
  renderOrder: RenderOrderService;
  editor: EditorService;
  selection: SelectionService;
}, IHooks> {
  return {
    name: HOSTED_COMPONENT_PLUGIN_ID,
    apply(ctx) {
      const render = ctx.services.require("scene");
      const camera = ctx.services.require("camera");
      const crdt = ctx.services.require("crdt");
      const editor = ctx.services.require("editor");
      const renderOrder = ctx.services.require("renderOrder");
      const selection = ctx.services.require("selection");

      void render;
      void camera;
      void crdt;
      void editor;
      void renderOrder;
      void selection;
    },
  };
}
