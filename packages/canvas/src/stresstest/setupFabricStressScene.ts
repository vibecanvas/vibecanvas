import { Canvas, Circle, FabricText, Line, Rect } from "fabric";
import { createStressTestScene, type TStressSceneSize } from "./createStressTestScene";
import type { TStressSceneHandle } from "./stresstest.types";

export function setupFabricStressScene(canvas: Canvas, size: TStressSceneSize): TStressSceneHandle {
  const scene = createStressTestScene(size);
  const setupStart = performance.now();
  const animatedNodes: Array<{ line: Line; node: Circle; baseX: number; baseY: number; amplitude: number; speed: number; phase: number; lineStartX: number; lineStartY: number; }> = [];
  let animationFrame = 0;

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
    const line = new Line(
      [tile.x + 6, tile.y + tile.height / 2, tile.nodeBaseX, tile.nodeBaseY],
      {
        stroke: tile.accent,
        strokeWidth: 1.5,
        selectable: false,
        evented: false,
      },
    );

    const node = new Circle({
      left: tile.nodeBaseX - tile.nodeRadius,
      top: tile.nodeBaseY - tile.nodeRadius,
      radius: tile.nodeRadius,
      fill: tile.accent,
      stroke: "#e2e8f0",
      strokeWidth: 1,
      selectable: false,
      evented: false,
    });

    animatedNodes.push({
      line,
      node,
      baseX: tile.nodeBaseX,
      baseY: tile.nodeBaseY,
      amplitude: tile.orbitAmplitude,
      speed: tile.orbitSpeed,
      phase: tile.orbitPhase,
      lineStartX: tile.x + 6,
      lineStartY: tile.y + tile.height / 2,
    });

    canvas.add(
      new Rect({
        left: tile.x,
        top: tile.y,
        width: tile.width,
        height: tile.height,
        fill: "#111827",
        stroke: tile.accent,
        strokeWidth: 1,
        selectable: false,
        evented: false,
      }),
      line,
      node,
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

  const animate = () => {
    const now = performance.now() / 1000;

    for (const item of animatedNodes) {
      const dx = Math.cos(now * item.speed + item.phase) * item.amplitude;
      const dy = Math.sin(now * item.speed + item.phase) * item.amplitude * 0.6;
      const x = item.baseX + dx;
      const y = item.baseY + dy;

      item.node.set({ left: x - item.node.radius, top: y - item.node.radius });
      item.line.set({ x1: item.lineStartX, y1: item.lineStartY, x2: x, y2: y });
    }

    canvas.renderAll();
    animationFrame = requestAnimationFrame(animate);
  };

  animationFrame = requestAnimationFrame(animate);

  return {
    metrics: {
      renderer: "fabric",
      tileCount: scene.tileCount,
      drawableCount: scene.drawableCount,
      setupMs,
      renderMs,
    },
    destroy: () => {
      cancelAnimationFrame(animationFrame);
    },
  };
}
