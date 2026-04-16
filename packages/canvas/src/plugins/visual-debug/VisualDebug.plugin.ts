import type { IPlugin } from "@vibecanvas/runtime";
import type { ThemeService } from "@vibecanvas/service-theme";
import Konva from "konva";
import type { IRuntimeHooks } from "../../runtime";
import type { CameraService } from "../../services/camera/CameraService";
import type { CanvasRegistryService } from "../../services/canvas-registry/CanvasRegistryService";
import type { SceneService } from "../../services/scene/SceneService";
import type { SelectionService } from "../../services/selection/SelectionService";

const SHOULD_RENDER_SELECTION = true;
const SHOULD_RENDER_FOCUSED_ID = true;

function formatCameraInfo(x: number, y: number, zoom: number) {
  return `x=${Math.round(x)} y=${Math.round(y)} zoom=${zoom.toFixed(2)}`;
}

function formatCanvasNodeType(canvasRegistry: CanvasRegistryService, node: Konva.Node) {
  const nodeType = canvasRegistry.getNodeType(node);
  if (nodeType) {
    return nodeType;
  }

  return node.getClassName();
}

function formatSelectionInfo(canvasRegistry: CanvasRegistryService, selection: SelectionService) {
  const lines: string[] = [];

  if (SHOULD_RENDER_SELECTION) {
    const selectedTypes = selection.selection.length === 0
      ? "[]"
      : `[${selection.selection.map((node) => formatCanvasNodeType(canvasRegistry, node)).join(", ")}]`;
    lines.push(`selection ${selectedTypes}`);
  }

  if (SHOULD_RENDER_FOCUSED_ID) {
    lines.push(`focusedId ${selection.focusedId ?? "null"}`);
  }

  return lines.join("\n");
}

export function createVisualDebugPlugin(): IPlugin<{
  camera: CameraService;
  canvasRegistry: CanvasRegistryService;
  scene: SceneService;
  selection: SelectionService;
  theme: ThemeService;
}, IRuntimeHooks> {
  return {
    name: "visual-debug",
    apply(ctx) {
      let text: Konva.Text | null = null;
      let offCameraChange: (() => boolean) | null = null;
      let offSelectionChange: (() => boolean) | null = null;
      let offThemeChange: (() => boolean) | null = null;
      let offSceneResize: (() => boolean) | null = null;
      let offElementsChange: (() => boolean) | null = null;
      let offGroupsChange: (() => boolean) | null = null;

      ctx.hooks.init.tap(() => {
        const scene = ctx.services.require("scene");
        const camera = ctx.services.require("camera");
        const canvasRegistry = ctx.services.require("canvasRegistry");
        const selection = ctx.services.require("selection");
        const theme = ctx.services.require("theme");
        text = new Konva.Text({
          x: 12,
          text: "",
          fontSize: 12,
          fontFamily: "monospace",
          listening: false,
        });

        const syncText = () => {
          if (!text) {
            return;
          }

          const lines = [formatCameraInfo(camera.x, camera.y, camera.zoom)];
          const selectionInfo = formatSelectionInfo(canvasRegistry, selection);
          if (selectionInfo.length > 0) {
            lines.push(selectionInfo);
          }

          text.text(lines.join("\n"));
          text.fill(theme.getTheme().colors.canvasDebugText);
          text.y(Math.max(12, scene.stage.height() - text.height() - 12));
          scene.staticBackgroundLayer.batchDraw();
        };

        scene.staticBackgroundLayer.add(text);
        syncText();

        offCameraChange = camera.hooks.change.tap(() => {
          syncText();
        });
        offSelectionChange = selection.hooks.change.tap(() => {
          syncText();
        });
        offThemeChange = theme.hooks.change.tap(() => {
          syncText();
        });
        offSceneResize = scene.hooks.resize.tap(() => {
          syncText();
        });
        offElementsChange = canvasRegistry.hooks.elementsChange.tap(() => {
          syncText();
        });
        offGroupsChange = canvasRegistry.hooks.groupsChange.tap(() => {
          syncText();
        });
      });

      ctx.hooks.destroy.tap(() => {
        offCameraChange?.();
        offCameraChange = null;
        offSelectionChange?.();
        offSelectionChange = null;
        offThemeChange?.();
        offThemeChange = null;
        offSceneResize?.();
        offSceneResize = null;
        offElementsChange?.();
        offElementsChange = null;
        offGroupsChange?.();
        offGroupsChange = null;
        text?.destroy();
        text = null;
      });
    },
  };
}
