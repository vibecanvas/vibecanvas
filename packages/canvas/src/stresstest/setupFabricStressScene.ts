import { Canvas, Circle, FabricText, Line, Rect } from "fabric";
import { createStressTestScene, type TStressSceneSize } from "./createStressTestScene";
import type { TStressSceneMetrics } from "./stresstest.types";

export function setupFabricStressScene(canvas: Canvas, size: TStressSceneSize): TStressSceneMetrics {
  const scene = createStressTestScene(size);
  const setupStart = performance.now();

  canvas.add(
    new Rect({
      left: 0,
      top: 0,
      width: size.width,
      height: size.height,
      fill: "#020617",
      selectable: false,
      evented: false,
    }),
  );

  for (const tile of scene.tiles) {
    canvas.add(
      new Rect({
        left: tile.x,
        top: tile.y,
        width: tile.width,
        height: tile.height,
        fill: "#111827",
        stroke: tile.accent,
        strokeWidth: 2,
        selectable: false,
        evented: false,
      }),
      new Line(
        [tile.x + 16, tile.y + tile.height / 2, tile.x + tile.width - 44, tile.y + tile.height / 2],
        {
          stroke: tile.accent,
          strokeWidth: 3,
          selectable: false,
          evented: false,
        },
      ),
      new Circle({
        left: tile.x + tile.width - 40,
        top: tile.y + tile.height / 2 - 12,
        radius: 12,
        fill: tile.accent,
        stroke: "#e2e8f0",
        strokeWidth: 2,
        selectable: false,
        evented: false,
      }),
    );

    if (tile.showLabel) {
      canvas.add(
        new FabricText(tile.label, {
          left: tile.x + 14,
          top: tile.y + 14,
          fontSize: 14,
          fill: "#cbd5e1",
          selectable: false,
          evented: false,
        }),
      );
    }
  }

  const setupMs = performance.now() - setupStart;
  const renderStart = performance.now();
  canvas.renderAll();
  const renderMs = performance.now() - renderStart;

  return {
    renderer: "fabric",
    tileCount: scene.tileCount,
    drawableCount: scene.drawableCount,
    setupMs,
    renderMs,
  };
}
