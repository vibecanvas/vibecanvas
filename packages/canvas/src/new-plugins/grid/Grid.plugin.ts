import type { IPlugin } from "@vibecanvas/runtime";
import type { ThemeService } from "@vibecanvas/service-theme";
import Grid2x2 from "lucide-static/icons/grid-2x2.svg?raw";
import type { CameraService } from "../../new-services/camera/CameraService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { SceneService } from "../../new-services/scene/SceneService";
import type { IHooks } from "../../runtime";
import { txDrawGrid } from "./tx.draw";

export function createGridPlugin(): IPlugin<{
  camera: CameraService;
  editor: EditorService;
  render: SceneService;
  theme: ThemeService;
}, IHooks> {
  let visible = true;

  return {
    name: "grid",
    apply(ctx) {
      const editor = ctx.services.require("editor");

      const syncGridTool = () => {
        editor.registerTool({
          id: "grid",
          label: "Grid",
          icon: Grid2x2,
          shortcuts: ["g"],
          priority: 9000,
          active: visible,
          onSelect: () => {
            ctx.hooks.gridVisible.call(!visible);
          },
          behavior: { type: "action" },
        });
      };

      syncGridTool();

      ctx.hooks.init.tap(() => {
        const render = ctx.services.require("scene");
        const camera = ctx.services.require("camera");
        const theme = ctx.services.require("theme");
        const gridShape = new render.Shape({
          listening: false,
          sceneFunc: (shapeContext) => {
            if (!visible) return;

            const width = render.stage.width();
            const height = render.stage.height();
            if (width <= 0 || height <= 0) return;

            const activeTheme = theme.getTheme();

            txDrawGrid({ shapeContext }, {
              width,
              height,
              zoom: camera.zoom,
              x: camera.x,
              y: camera.y,
              minorGridColor: activeTheme.colors.canvasGridMinor,
              majorGridColor: activeTheme.colors.canvasGridMajor,
            });
          },
        });

        render.staticBackgroundLayer.add(gridShape);
        render.staticBackgroundLayer.batchDraw();

        camera.hooks.change.tap(() => {
          render.staticBackgroundLayer.batchDraw();
        });

        theme.hooks.change.tap(() => {
          render.staticBackgroundLayer.batchDraw();
        });

        render.hooks.resize.tap(() => {
          render.staticBackgroundLayer.batchDraw();
        });

        ctx.hooks.gridVisible.tap((value) => {
          visible = value;
          syncGridTool();
          render.staticBackgroundLayer.batchDraw();
        });
      });

      ctx.hooks.destroy.tap(() => {
        editor.unregisterTool("grid");
      });
    },
  };
}
