const BASE_GRID_SIZE = 32;
const MIN_SCREEN_SPACING = 24;
const MAX_SCREEN_SPACING = 96;

export type TGridLayout = {
  minorStartX: number;
  minorStartY: number;
  minorScreenSize: number;
  majorStartX: number;
  majorStartY: number;
  majorScreenSize: number;
};

export function fxNormalizeOffset(value: number, spacing: number) {
  return ((value % spacing) + spacing) % spacing;
}

export function fxGetGridWorldSize(scale: number) {
  let worldSize = BASE_GRID_SIZE;
  let screenSpacing = worldSize * scale;

  while (screenSpacing < MIN_SCREEN_SPACING) {
    worldSize *= 2;
    screenSpacing = worldSize * scale;
  }

  while (screenSpacing > MAX_SCREEN_SPACING && worldSize > BASE_GRID_SIZE / 4) {
    worldSize /= 2;
    screenSpacing = worldSize * scale;
  }

  return worldSize;
}

export function fxGetGridLayout(args: { zoom: number; x: number; y: number }): TGridLayout {
  const minorWorldSize = fxGetGridWorldSize(args.zoom);
  const majorWorldSize = minorWorldSize * 4;
  const minorScreenSize = minorWorldSize * args.zoom;
  const majorScreenSize = majorWorldSize * args.zoom;

  return {
    minorStartX: fxNormalizeOffset(args.x, minorScreenSize),
    minorStartY: fxNormalizeOffset(args.y, minorScreenSize),
    minorScreenSize,
    majorStartX: fxNormalizeOffset(args.x, majorScreenSize),
    majorStartY: fxNormalizeOffset(args.y, majorScreenSize),
    majorScreenSize,
  };
}
