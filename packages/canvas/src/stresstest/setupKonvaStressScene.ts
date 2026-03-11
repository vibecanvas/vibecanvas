import Konva from "konva";
import { createStressTestScene, type TStressSceneSize } from "./createStressTestScene";
import type { TStressSceneHandle } from "./stresstest.types";

export function setupKonvaStressScene(stage: Konva.Stage, size: TStressSceneSize): TStressSceneHandle {
  const scene = createStressTestScene(size);
  const setupStart = performance.now();
  const layer = new Konva.Layer();
  const animatedNodes: Array<{ connector: Konva.Line; node: Konva.Circle; baseX: number; baseY: number; amplitude: number; speed: number; phase: number; lineStartX: number; lineStartY: number; }> = [];

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
    const connector = new Konva.Line({
      points: [tile.x + 6, tile.y + tile.height / 2, tile.nodeBaseX, tile.nodeBaseY],
      stroke: tile.accent,
      strokeWidth: 1.5,
      lineCap: "round",
      lineJoin: "round",
      listening: false,
    });

    const node = new Konva.Circle({
      x: tile.nodeBaseX,
      y: tile.nodeBaseY,
      radius: tile.nodeRadius,
      fill: tile.accent,
      stroke: "#e2e8f0",
      strokeWidth: 1,
      listening: false,
    });

    animatedNodes.push({
      connector,
      node,
      baseX: tile.nodeBaseX,
      baseY: tile.nodeBaseY,
      amplitude: tile.orbitAmplitude,
      speed: tile.orbitSpeed,
      phase: tile.orbitPhase,
      lineStartX: tile.x + 6,
      lineStartY: tile.y + tile.height / 2,
    });

    layer.add(
      new Konva.Rect({
        x: tile.x,
        y: tile.y,
        width: tile.width,
        height: tile.height,
        fill: "#111827",
        stroke: tile.accent,
        strokeWidth: 1,
        listening: false,
      }),
      connector,
      node,
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

  const animation = new Konva.Animation((frame) => {
    const now = (frame?.time ?? performance.now()) / 1000;

    for (const item of animatedNodes) {
      const dx = Math.cos(now * item.speed + item.phase) * item.amplitude;
      const dy = Math.sin(now * item.speed + item.phase) * item.amplitude * 0.6;
      const x = item.baseX + dx;
      const y = item.baseY + dy;

      item.node.position({ x, y });
      item.connector.points([item.lineStartX, item.lineStartY, x, y]);
    }
  }, layer);

  animation.start();

  return {
    metrics: {
      renderer: "konva",
      tileCount: scene.tileCount,
      drawableCount: scene.drawableCount,
      setupMs,
      renderMs,
    },
    destroy: () => {
      animation.stop();
    },
  };
}
