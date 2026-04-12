import type { IPlugin } from "@vibecanvas/runtime";
import type { ThemeService } from "@vibecanvas/service-theme";
import type { CameraService } from "../../new-services/camera/CameraService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import type { IHooks } from "../../runtime";

const SHOULD_RENDER_SELECTION = true;
const SHOULD_RENDER_FOCUSED_ID = true;

function formatCameraInfo(x: number, y: number, zoom: number) {
  return `x=${Math.round(x)} y=${Math.round(y)} zoom=${zoom.toFixed(2)}`;
}

function formatSelectionInfo(selection: SelectionService) {
  const lines: string[] = [];

  if (SHOULD_RENDER_SELECTION) {
    const selectedTypes = selection.selection.length === 0
      ? "[]"
      : `[${selection.selection.map((node) => node.getClassName()).join(", ")}]`;
    lines.push(`selection ${selectedTypes}`);
  }

  if (SHOULD_RENDER_FOCUSED_ID) {
    lines.push(`focusedId ${selection.focusedId ?? "null"}`);
  }

  return lines.join("\n");
}

export function createVisualDebugPlugin(): IPlugin<{
  camera: CameraService;
  render: RenderService;
  selection: SelectionService;
  theme: ThemeService;
}, IHooks> {
  return {
    name: "visual-debug",
    apply(ctx) {
      ctx.hooks.init.tap(() => {
        const render = ctx.services.require("render");
        const camera = ctx.services.require("camera");
        const selection = ctx.services.require("selection");
        const theme = ctx.services.require("theme");
        const text = new render.Text({
          x: 12,
          y: 12,
          text: "",
          fontSize: 12,
          fontFamily: "monospace",
          listening: false,
        });

        const syncText = () => {
          const lines = [formatCameraInfo(camera.x, camera.y, camera.zoom)];
          const selectionInfo = formatSelectionInfo(selection);
          if (selectionInfo.length > 0) {
            lines.push(selectionInfo);
          }

          text.text(lines.join("\n"));
          text.fill(theme.getTheme().colors.canvasDebugText);
          render.staticBackgroundLayer.batchDraw();
        };

        render.staticBackgroundLayer.add(text);
        syncText();

        camera.hooks.change.tap(() => {
          syncText();
        });
        selection.hooks.change.tap(() => {
          syncText();
        });
        theme.hooks.change.tap(() => {
          syncText();
        });
      });
    },
  };
}
