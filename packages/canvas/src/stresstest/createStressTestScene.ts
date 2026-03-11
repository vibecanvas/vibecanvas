export type TStressSceneSize = {
  width: number;
  height: number;
};

export type TStressSceneTile = {
  x: number;
  y: number;
  width: number;
  height: number;
  accent: string;
  accentHex: number;
  label: string;
  showLabel: boolean;
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
  const tileWidth = 160;
  const tileHeight = 96;
  const gapX = 24;
  const gapY = 24;
  const padding = 48;
  const columns = 12;
  const rows = 12;
  const tiles: TStressSceneTile[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const accent = ACCENTS[index % ACCENTS.length];

      tiles.push({
        x: padding + column * (tileWidth + gapX),
        y: padding + row * (tileHeight + gapY),
        width: tileWidth,
        height: tileHeight,
        accent: accent.css,
        accentHex: accent.hex,
        label: `node-${index}`,
        showLabel: index % 3 === 0,
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
