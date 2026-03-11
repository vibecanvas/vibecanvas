import { Application, Container, Graphics, Text } from "pixi.js";
import { createStressTestScene, type TStressSceneSize } from "./createStressTestScene";
import type { TStressSceneMetrics } from "./stresstest.types";

export function setupPixiStressScene(app: Application, size: TStressSceneSize): TStressSceneMetrics {
  const scene = createStressTestScene(size);
  const setupStart = performance.now();
  const container = new Container();

  const background = new Graphics()
    .rect(0, 0, size.width, size.height)
    .fill({ color: 0x020617 });

  container.addChild(background);

  for (const tile of scene.tiles) {
    const card = new Graphics()
      .rect(tile.x, tile.y, tile.width, tile.height)
      .fill({ color: 0x111827 })
      .stroke({ width: 2, color: tile.accentHex });

    const connector = new Graphics()
      .moveTo(tile.x + 16, tile.y + tile.height / 2)
      .lineTo(tile.x + tile.width - 44, tile.y + tile.height / 2)
      .stroke({ width: 3, color: tile.accentHex });

    const node = new Graphics()
      .circle(tile.x + tile.width - 28, tile.y + tile.height / 2, 12)
      .fill({ color: tile.accentHex })
      .stroke({ width: 2, color: 0xe2e8f0 });

    container.addChild(card, connector, node);

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

  return {
    renderer: "pixi",
    tileCount: scene.tileCount,
    drawableCount: scene.drawableCount,
    setupMs,
    renderMs,
  };
}
