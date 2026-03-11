export type TStressSceneSize = {
  width: number;
  height: number;
};

export type TStressSceneTile = {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  accent: string;
  accentHex: number;
  label: string;
  showLabel: boolean;
  nodeBaseX: number;
  nodeBaseY: number;
  nodeRadius: number;
  orbitAmplitude: number;
  orbitSpeed: number;
  orbitPhase: number;
};

export type TStressScene = {
  size: TStressSceneSize;
  tileCount: number;
  drawableCount: number;
  tiles: TStressSceneTile[];
};

const ACCENTS = [
  { css: "#38bdf8", hex: 0x38bdf8 },
  { css: "#22c55e", hex: 0x22c55e },
  { css: "#f97316", hex: 0xf97316 },
  { css: "#eab308", hex: 0xeab308 },
];

export function createStressTestScene(size: TStressSceneSize): TStressScene {
  const tileWidth = 44;
  const tileHeight = 28;
  const gapX = 8;
  const gapY = 8;
  const padding = 12;
  const columns = 100;
  const rows = 100;
  const tiles: TStressSceneTile[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const accent = ACCENTS[index % ACCENTS.length];

      tiles.push({
        index,
        x: padding + column * (tileWidth + gapX),
        y: padding + row * (tileHeight + gapY),
        width: tileWidth,
        height: tileHeight,
        accent: accent.css,
        accentHex: accent.hex,
        label: `node-${index}`,
        showLabel: index % 200 === 0,
        nodeBaseX: padding + column * (tileWidth + gapX) + tileWidth - 12,
        nodeBaseY: padding + row * (tileHeight + gapY) + tileHeight / 2,
        nodeRadius: 4,
        orbitAmplitude: 4 + (index % 4),
        orbitSpeed: 0.8 + (index % 5) * 0.18,
        orbitPhase: (index % 360) * (Math.PI / 180),
      });
    }
  }

  const labelCount = tiles.filter((tile) => tile.showLabel).length;

  return {
    size,
    tileCount: tiles.length,
    drawableCount: 1 + tiles.length * 3 + labelCount,
    tiles,
  };
}
