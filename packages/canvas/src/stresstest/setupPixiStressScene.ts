import { Application, Container, Graphics, Text } from "pixi.js";
import { createStressTestScene, type TStressSceneSize } from "./createStressTestScene";
import type { TStressSceneHandle } from "./stresstest.types";

export function setupPixiStressScene(app: Application, size: TStressSceneSize): TStressSceneHandle {
  const scene = createStressTestScene(size);
  const setupStart = performance.now();
  const container = new Container();
  const animatedNodes: Array<{ orbit: Container; baseX: number; baseY: number; amplitude: number; speed: number; phase: number; }> = [];

  container.interactiveChildren = false;

  const background = new Graphics()
    .rect(0, 0, size.width, size.height)
    .fill({ color: 0x020617 });

  container.addChild(background);

  for (const tile of scene.tiles) {
    const card = new Graphics()
      .rect(tile.x, tile.y, tile.width, tile.height)
      .fill({ color: 0x111827 })
      .stroke({ width: 1, color: tile.accentHex });

    const orbit = new Container({
      x: tile.x + 6,
      y: tile.y + tile.height / 2,
    });
    orbit.interactiveChildren = false;

    const connector = new Graphics()
      .moveTo(0, 0)
      .lineTo(tile.width - 18, 0)
      .stroke({ width: 1.5, color: tile.accentHex });

    const node = new Graphics()
      .circle(tile.width - 18, 0, tile.nodeRadius)
      .fill({ color: tile.accentHex })
      .stroke({ width: 1, color: 0xe2e8f0 });

    orbit.addChild(connector, node);

    animatedNodes.push({
      orbit,
      baseX: tile.x + 6,
      baseY: tile.y + tile.height / 2,
      amplitude: tile.orbitAmplitude,
      speed: tile.orbitSpeed,
      phase: tile.orbitPhase,
    });

    container.addChild(card, orbit);

    if (tile.showLabel) {
      container.addChild(
        new Text({
          text: tile.label,
          x: tile.x + 14,
          y: tile.y + 12,
          style: {
            fill: 0xcbd5e1,
            fontSize: 14,
          },
        }),
      );
    }
  }

  app.stage.addChild(container);

  const setupMs = performance.now() - setupStart;
  const renderStart = performance.now();
  app.render();
  const renderMs = performance.now() - renderStart;

  const ticker = () => {
    const now = performance.now() / 1000;

    for (const item of animatedNodes) {
      const phase = now * item.speed + item.phase;

      item.orbit.rotation = phase;
      item.orbit.scale.y = 0.75 + Math.sin(phase) * 0.15;
      item.orbit.position.set(item.baseX, item.baseY + Math.sin(phase) * item.amplitude * 0.08);
    }
  };

  app.ticker.add(ticker);
  app.ticker.start();

  return {
    metrics: {
      renderer: "pixi",
      tileCount: scene.tileCount,
      drawableCount: scene.drawableCount,
      setupMs,
      renderMs,
    },
    destroy: () => {
      app.ticker.remove(ticker);
      app.ticker.stop();
    },
  };
}
