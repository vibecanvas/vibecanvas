import type { IPlugin } from "@vibecanvas/runtime";
import type { CameraService } from "../../new-services/camera/CameraService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { IHooks } from "../../runtime";
import { txDrawGrid } from "./tx.draw";

const minorGridColor = "rgba(71, 85, 105, 0.16)";
const majorGridColor = "rgba(71, 85, 105, 0.28)";

export function createGridPlugin(): IPlugin<{
  camera: CameraService;
  render: RenderService;
}, IHooks> {
  let visible = true;

  return {
    name: "grid",
    apply(ctx) {
      ctx.hooks.init.tap(() => {
        const render = ctx.services.require("render");
        const camera = ctx.services.require("camera");
        const gridShape = new render.Shape({
          listening: false,
          sceneFunc: (shapeContext) => {
            if (!visible) return;

            const width = render.stage.width();
            const height = render.stage.height();
            if (width <= 0 || height <= 0) return;

            txDrawGrid({ shapeContext }, {
              width,
              height,
              zoom: camera.zoom,
              x: camera.x,
              y: camera.y,
              minorGridColor,
              majorGridColor,
            });
          },
        });

        render.staticBackgroundLayer.add(gridShape);
        render.staticBackgroundLayer.batchDraw();

        camera.hooks.change.tap(() => {
          render.staticBackgroundLayer.batchDraw();
        });

        render.hooks.resize.tap(() => {
          render.staticBackgroundLayer.batchDraw();
        });

        ctx.hooks.gridVisible.tap((value) => {
          visible = value;
          render.staticBackgroundLayer.batchDraw();
        });
      });
    },
  };
}
