import type { IPlugin } from "@vibecanvas/runtime";
import type { ThemeService } from "@vibecanvas/service-theme";
import Konva from "konva";
import type { CameraService } from "../../services/camera/CameraService";
import type { SceneService } from "../../services/scene/SceneService";
import type { SelectionService } from "../../services/selection/SelectionService";
import type { IHooks } from "../../runtime";
import type { EditorServiceV2 } from "src/services/editor/EditorServiceV2";

const SHOULD_RENDER_SELECTION = true;
const SHOULD_RENDER_FOCUSED_ID = true;

function formatCameraInfo(x: number, y: number, zoom: number) {
  return `x=${Math.round(x)} y=${Math.round(y)} zoom=${zoom.toFixed(2)}`;
}

function formatCanvasNodeType(editor: EditorService, node: { getClassName(): string }) {
  if (editor.toGroup(node as never)) {
    return "group";
  }

  const element = editor.toElement(node as never);
  if (element) {
    if (element.data.type === "custom") {
      const kind = typeof element.data.payload === "object"
        && element.data.payload !== null
        && "kind" in element.data.payload
        && typeof element.data.payload.kind === "string"
        ? element.data.payload.kind
        : "unknown";
      return `custom:${kind}`;
    }

    return element.data.type;
  }

  return node.getClassName();
}

function formatSelectionInfo(editor: EditorServiceV2, selection: SelectionService) {
  const lines: string[] = [];

  if (SHOULD_RENDER_SELECTION) {
    const selectedTypes = selection.selection.length === 0
      ? "[]"
      : `[${selection.selection.map((node) => formatCanvasNodeType(editor, node)).join(", ")}]`;
    lines.push(`selection ${selectedTypes}`);
  }

  if (SHOULD_RENDER_FOCUSED_ID) {
    lines.push(`focusedId ${selection.focusedId ?? "null"}`);
  }

  return lines.join("\n");
}

export function createVisualDebugPlugin(): IPlugin<{
  camera: CameraService;
  editor2: EditorServiceV2;
  scene: SceneService;
  selection: SelectionService;
  theme: ThemeService;
}, IHooks> {
  return {
    name: "visual-debug",
    apply(ctx) {
      ctx.hooks.init.tap(() => {
        const scene = ctx.services.require("scene");
        const camera = ctx.services.require("camera");
        const editor = ctx.services.require("editor2");
        const selection = ctx.services.require("selection");
        const theme = ctx.services.require("theme");
        const text = new Konva.Text({
          x: 12,
          text: "",
          fontSize: 12,
          fontFamily: "monospace",
          listening: false,
        });

        const syncText = () => {
          const lines = [formatCameraInfo(camera.x, camera.y, camera.zoom)];
          const selectionInfo = formatSelectionInfo(editor, selection);
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

        camera.hooks.change.tap(() => {
          syncText();
        });
        selection.hooks.change.tap(() => {
          syncText();
        });
        theme.hooks.change.tap(() => {
          syncText();
        });
        scene.hooks.resize.tap(() => {
          syncText();
        });
      });
    },
  };
}
