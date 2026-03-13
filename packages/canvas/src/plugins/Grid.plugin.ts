import { Camera } from "src/services/canvas/Camera";
import type { IPlugin, IPluginContext } from "./interface";
import { CustomEvents } from "../custom-events";

import Konva from "konva";

type TRenderGridArgs = {
  layer: Konva.Layer;
  width: number;
  height: number;
  camera: Camera;
  visible: boolean;
};

const BASE_GRID_SIZE = 32;
const MIN_SCREEN_SPACING = 24;
const MAX_SCREEN_SPACING = 96;

function normalizeOffset(value: number, spacing: number) {
  return ((value % spacing) + spacing) % spacing;
}

function getGridWorldSize(scale: number) {
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

function renderGrid(args: TRenderGridArgs) {
  const { layer, width, height, camera, visible } = args;

  layer.visible(visible);
  layer.destroyChildren();

  if (!visible || width <= 0 || height <= 0) {
    layer.batchDraw();
    return;
  }

  const zoom = camera.zoom
  const x = camera.x
  const y = camera.y

  const minorWorldSize = getGridWorldSize(zoom);
  const majorWorldSize = minorWorldSize * 4;
  const minorScreenSize = minorWorldSize * zoom;
  const majorScreenSize = majorWorldSize * zoom;
  const minorStartX = normalizeOffset(x, minorScreenSize);
  const minorStartY = normalizeOffset(y, minorScreenSize);
  const majorStartX = normalizeOffset(x, majorScreenSize);
  const majorStartY = normalizeOffset(y, majorScreenSize);

  for (let currentX = minorStartX; currentX <= width; currentX += minorScreenSize) {
    layer.add(new Konva.Line({
      points: [currentX, 0, currentX, height],
      stroke: "rgba(71, 85, 105, 0.16)",
      strokeWidth: 1,
      listening: false,
    }));
  }

  for (let currentY = minorStartY; currentY <= height; currentY += minorScreenSize) {
    layer.add(new Konva.Line({
      points: [0, currentY, width, currentY],
      stroke: "rgba(71, 85, 105, 0.16)",
      strokeWidth: 1,
      listening: false,
    }));
  }

  for (let currentX = majorStartX; currentX <= width; currentX += majorScreenSize) {
    layer.add(new Konva.Line({
      points: [currentX, 0, currentX, height],
      stroke: "rgba(71, 85, 105, 0.28)",
      strokeWidth: 1,
      listening: false,
    }));
  }

  for (let currentY = majorStartY; currentY <= height; currentY += majorScreenSize) {
    layer.add(new Konva.Line({
      points: [0, currentY, width, currentY],
      stroke: "rgba(71, 85, 105, 0.28)",
      strokeWidth: 1,
      listening: false,
    }));
  }

  layer.batchDraw();
}

export class GridPlugin implements IPlugin {
  #visible: boolean = true;
  constructor() {

  }

  apply(context: IPluginContext): void {
    const rerenderGrid = () => renderGrid({
      camera: context.camera,
      height: context.stage.height(),
      width: context.stage.width(),
      layer: context.staticLayer,
      visible: this.#visible,
    });

    rerenderGrid();
    context.hooks.cameraChange.tap(() => { if (this.#visible) rerenderGrid() });
    context.hooks.customEvent.tap((event, value) => {
      if (event !== CustomEvents.GRID_VISIBLE) return false;
      this.#visible = value;
      rerenderGrid();

      return false;
    });
  }
}
