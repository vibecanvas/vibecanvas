import type { IPlugin, IPluginContext } from "./interface";
import { CustomEvents } from "../custom-events";
import Konva from "konva";

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

export class GridPlugin implements IPlugin {
  #visible = true;

  apply(context: IPluginContext): void {
    const gridShape = new Konva.Shape({
      listening: false,
      sceneFunc: (ctx) => {
        if (!this.#visible) return;

        const width = context.stage.width();
        const height = context.stage.height();
        if (width <= 0 || height <= 0) return;

        const { zoom, x, y } = context.camera;
        const minorWorldSize = getGridWorldSize(zoom);
        const majorWorldSize = minorWorldSize * 4;
        const minorScreenSize = minorWorldSize * zoom;
        const majorScreenSize = majorWorldSize * zoom;
        const minorStartX = normalizeOffset(x, minorScreenSize);
        const minorStartY = normalizeOffset(y, minorScreenSize);
        const majorStartX = normalizeOffset(x, majorScreenSize);
        const majorStartY = normalizeOffset(y, majorScreenSize);

        const raw = (ctx as any)._context as CanvasRenderingContext2D;

        raw.beginPath();
        raw.strokeStyle = "rgba(71, 85, 105, 0.16)";
        raw.lineWidth = 1;
        for (let cx = minorStartX; cx <= width; cx += minorScreenSize) {
          raw.moveTo(cx, 0);
          raw.lineTo(cx, height);
        }
        for (let cy = minorStartY; cy <= height; cy += minorScreenSize) {
          raw.moveTo(0, cy);
          raw.lineTo(width, cy);
        }
        raw.stroke();

        raw.beginPath();
        raw.strokeStyle = "rgba(71, 85, 105, 0.28)";
        raw.lineWidth = 1;
        for (let cx = majorStartX; cx <= width; cx += majorScreenSize) {
          raw.moveTo(cx, 0);
          raw.lineTo(cx, height);
        }
        for (let cy = majorStartY; cy <= height; cy += majorScreenSize) {
          raw.moveTo(0, cy);
          raw.lineTo(width, cy);
        }
        raw.stroke();
      },
    });

    context.staticBackgroundLayer.add(gridShape);
    context.staticBackgroundLayer.batchDraw();

    context.hooks.cameraChange.tap(() => {
      context.staticBackgroundLayer.batchDraw();
    });

    context.hooks.resize.tap(() => {
      context.staticBackgroundLayer.batchDraw();
    });

    context.hooks.customEvent.tap((event, value) => {
      if (event !== CustomEvents.GRID_VISIBLE) return false;
      this.#visible = value;
      context.staticBackgroundLayer.batchDraw();
      return false;
    });
  }
}
