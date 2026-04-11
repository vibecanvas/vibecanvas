import type { IService, IStartableService, IStoppableService } from "@vibecanvas/runtime";
import { SyncHook } from "@vibecanvas/tapable";
import type { RenderService } from "../render/RenderService";

export type TCameraServiceArgs = {
  render: RenderService;
};

/**
 * Holds canvas camera state and camera operations.
 * Wraps the current camera implementation behind a service.
 */
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

interface TCameraServiceHooks {
  change: SyncHook<[]>;
}

export class CameraService implements IService<TCameraServiceHooks>, IStartableService, IStoppableService {
  readonly name = "camera";

  readonly render: RenderService;
  readonly hooks: TCameraServiceHooks = {
    change: new SyncHook(),
  };

  started = false;
  x = 0;
  y = 0;
  zoom = 1;

  constructor(args: TCameraServiceArgs) {
    this.render = args.render;
  }

  start(): void | Promise<void> {
    if (this.started) {
      return;
    }

    this.x = 0;
    this.y = 0;
    this.zoom = 1;
    this.#updatePosition({ x: this.x, y: this.y });
    this.#updateZoom(this.zoom);
    this.started = true;
  }

  stop(): void | Promise<void> {
    if (!this.started) {
      return;
    }

    this.started = false;
  }

  pan(deltaX: number, deltaY: number) {
    const nextX = this.x - deltaX;
    const nextY = this.y - deltaY;

    this.x = nextX;
    this.y = nextY;
    this.#updatePosition({ x: nextX, y: nextY });
    this.hooks.change.call();
  }

  zoomAtScreenPoint(scale: number, screenPoint: { x: number; y: number }) {
    const nextZoom = clampZoom(scale);
    const worldPoint = {
      x: (screenPoint.x - this.x) / this.zoom,
      y: (screenPoint.y - this.y) / this.zoom,
    };
    const nextX = screenPoint.x - worldPoint.x * nextZoom;
    const nextY = screenPoint.y - worldPoint.y * nextZoom;

    this.zoom = nextZoom;
    this.x = nextX;
    this.y = nextY;
    this.#updatePosition({ x: nextX, y: nextY });
    this.#updateZoom(nextZoom);
    this.hooks.change.call();
  }

  #updatePosition(position: { x: number; y: number }) {
    this.render.dynamicLayer.position(position);
    this.render.staticForegroundLayer.position(position);
    this.render.dynamicLayer.batchDraw();
    this.render.staticForegroundLayer.batchDraw();
  }

  #updateZoom(zoom: number) {
    this.render.dynamicLayer.scale({ x: zoom, y: zoom });
    this.render.staticForegroundLayer.scale({ x: zoom, y: zoom });
    this.render.dynamicLayer.batchDraw();
    this.render.staticForegroundLayer.batchDraw();
  }
}
