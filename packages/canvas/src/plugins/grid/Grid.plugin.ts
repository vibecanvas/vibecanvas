import type { IPlugin } from "@vibecanvas/runtime";
import type { ThemeService } from "@vibecanvas/service-theme";
import Grid2x2 from "lucide-static/icons/grid-2x2.svg?raw";
import Konva from "konva";
import type { CameraService } from "../../services/camera/CameraService";
import type { EditorService } from "../../services/editor/EditorService";
import type { SceneService } from "../../services/scene/SceneService";
import type { IHooks } from "../../runtime";
import { txDrawGrid } from "./tx.draw";
import { EditorServiceV2 } from "src/services/editor/EditorServiceV2";

export function createGridPlugin(): IPlugin<{
  camera: CameraService;
  editor2: EditorServiceV2;
  scene: SceneService;
  theme: ThemeService;
}, IHooks> {
  let visible = true;

  return {
    name: "grid",
    apply(ctx) {
      const editor = ctx.services.require("editor2");

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
        const scene = ctx.services.require("scene");
        const camera = ctx.services.require("camera");
        const theme = ctx.services.require("theme");
        const gridShape = new Konva.Shape({
          listening: false,
          sceneFunc: (shapeContext: Konva.Context) => {
            if (!visible) return;

            const width = scene.stage.width();
            const height = scene.stage.height();
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

        scene.staticBackgroundLayer.add(gridShape);
        scene.staticBackgroundLayer.batchDraw();

        camera.hooks.change.tap(() => {
          scene.staticBackgroundLayer.batchDraw();
        });

        theme.hooks.change.tap(() => {
          scene.staticBackgroundLayer.batchDraw();
        });

        scene.hooks.resize.tap(() => {
          scene.staticBackgroundLayer.batchDraw();
        });

        ctx.hooks.gridVisible.tap((value) => {
          visible = value;
          syncGridTool();
          scene.staticBackgroundLayer.batchDraw();
        });
      });

      ctx.hooks.destroy.tap(() => {
        editor.unregisterTool("grid");
      });
    },
  };
}
