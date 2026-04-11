import type { IPlugin } from "@vibecanvas/runtime";
import type { CameraService } from "../../new-services/camera/CameraService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { IHooks } from "../../runtime";

function formatCameraInfo(x: number, y: number, zoom: number): string {
  return `x: ${Math.round(x)}  y: ${Math.round(y)}  zoom: ${zoom.toFixed(2)}`;
}

export function createVisualDebugPlugin(): IPlugin<{
  camera: CameraService;
  render: RenderService;
}, IHooks> {
  return {
    name: "visual-debug",
    apply(ctx) {
      ctx.hooks.init.tap(() => {
        const render = ctx.services.require("render");
        const camera = ctx.services.require("camera");
        const text = new render.Text({
          x: 12,
          y: 12,
          text: formatCameraInfo(camera.x, camera.y, camera.zoom),
          fontSize: 12,
          fontFamily: "monospace",
          fill: "rgba(71, 85, 105, 0.8)",
          listening: false,
        });

        const syncText = () => {
          text.text(formatCameraInfo(camera.x, camera.y, camera.zoom));
          render.staticBackgroundLayer.batchDraw();
        };

        render.staticBackgroundLayer.add(text);
        render.staticBackgroundLayer.batchDraw();

        camera.hooks.change.tap(() => {
          syncText();
        });
      });
    },
  };
}
