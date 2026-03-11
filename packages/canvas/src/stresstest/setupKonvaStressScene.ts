import Konva from "konva";
import { createStressTestScene, type TStressSceneSize } from "./createStressTestScene";
import type { TStressSceneMetrics } from "./stresstest.types";

export function setupKonvaStressScene(stage: Konva.Stage, size: TStressSceneSize): TStressSceneMetrics {
  const scene = createStressTestScene(size);
  const setupStart = performance.now();
  const layer = new Konva.Layer();

  layer.add(
    new Konva.Rect({
      x: 0,
      y: 0,
      width: size.width,
      height: size.height,
      fill: "#020617",
      listening: false,
    }),
  );

  for (const tile of scene.tiles) {
    layer.add(
      new Konva.Rect({
        x: tile.x,
        y: tile.y,
        width: tile.width,
        height: tile.height,
        fill: "#111827",
        stroke: tile.accent,
        strokeWidth: 2,
        listening: false,
      }),
      new Konva.Line({
        points: [tile.x + 16, tile.y + tile.height / 2, tile.x + tile.width - 44, tile.y + tile.height / 2],
        stroke: tile.accent,
        strokeWidth: 3,
        lineCap: "round",
        lineJoin: "round",
        listening: false,
      }),
      new Konva.Circle({
        x: tile.x + tile.width - 28,
        y: tile.y + tile.height / 2,
        radius: 12,
        fill: tile.accent,
        stroke: "#e2e8f0",
        strokeWidth: 2,
        listening: false,
      }),
    );

    if (tile.showLabel) {
      layer.add(
        new Konva.Text({
          x: tile.x + 14,
          y: tile.y + 12,
          text: tile.label,
          fontSize: 14,
          fill: "#cbd5e1",
          listening: false,
        }),
      );
    }
  }

  stage.add(layer);

  const setupMs = performance.now() - setupStart;
  const renderStart = performance.now();
  layer.draw();
  const renderMs = performance.now() - renderStart;

  return {
    renderer: "konva",
    tileCount: scene.tileCount,
    drawableCount: scene.drawableCount,
    setupMs,
    renderMs,
  };
}
