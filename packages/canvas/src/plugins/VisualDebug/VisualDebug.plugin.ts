import Konva from "konva";
import type { IPlugin, IPluginContext } from "../shared/interface";

function formatCameraInfo(x: number, y: number, zoom: number): string {
  return `x: ${Math.round(x)}  y: ${Math.round(y)}  zoom: ${zoom.toFixed(2)}`;
}

export class VisualDebugPlugin implements IPlugin {
  apply(context: IPluginContext): void {
    const text = new Konva.Text({
      x: 12,
      y: 12,
      text: formatCameraInfo(context.camera.x, context.camera.y, context.camera.zoom),
      fontSize: 12,
      fontFamily: "monospace",
      fill: "rgba(71, 85, 105, 0.8)",
      listening: false,
    });

    context.staticBackgroundLayer.add(text);
    context.staticBackgroundLayer.batchDraw();

    context.hooks.cameraChange.tap(() => {
      text.text(formatCameraInfo(context.camera.x, context.camera.y, context.camera.zoom));
      context.staticBackgroundLayer.batchDraw();
    });
  }
}
