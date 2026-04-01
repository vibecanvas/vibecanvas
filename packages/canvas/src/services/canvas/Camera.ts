import type Konva from "konva";
import { IPluginContext } from "src/plugins/interface";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export class Camera {
  #dynamicLayer: Konva.Layer;
  #staticForgroundLayer: Konva.Layer
  #x: number = 0;
  #y: number = 0;
  #zoom: number = 1;

  constructor(ctx: { dynamicLayer: Konva.Layer, staticForegroundLayer: Konva.Layer }) {
    this.#dynamicLayer = ctx.dynamicLayer;
    this.#staticForgroundLayer = ctx.staticForegroundLayer;
  }

  get x() {
    return this.#x;
  }

  get y() {
    return this.#y;
  }

  get zoom() {
    return this.#zoom;
  }

  set x(value: number) {
    this.#x = value;
  }

  set y(value: number) {
    this.#y = value;
  }

  set zoom(value: number) {
    this.#zoom = clampZoom(value);
  }

  pan(deltaX: number, deltaY: number) {
    const nextX = this.#x - deltaX;
    const nextY = this.#y - deltaY;

    this.#x = nextX;
    this.#y = nextY;
    this.apply({ pos: { x: nextX, y: nextY } });
  }

  zoomAtScreenPoint(scale: number, screenPoint: { x: number; y: number }) {
    const nextZoom = clampZoom(scale);
    const worldPoint = {
      x: (screenPoint.x - this.#x) / this.#zoom,
      y: (screenPoint.y - this.#y) / this.#zoom,
    };
    const nextX = screenPoint.x - worldPoint.x * nextZoom;
    const nextY = screenPoint.y - worldPoint.y * nextZoom;

    this.#zoom = nextZoom;
    this.#x = nextX;
    this.#y = nextY;
    this.apply({ pos: { x: nextX, y: nextY }, zoom: nextZoom });
  }

  private apply(args: { pos?: { x: number, y: number }, zoom?: number }) {
    if (args.pos) {
      this.#dynamicLayer.position(args.pos);
      this.#staticForgroundLayer.position(args.pos);
    }
    if (args.zoom) {
      this.#dynamicLayer.scale({ x: args.zoom, y: args.zoom });
      this.#staticForgroundLayer.scale({ x: args.zoom, y: args.zoom });
    }
    this.#dynamicLayer.batchDraw();
    this.#staticForgroundLayer.batchDraw();
  }
}
