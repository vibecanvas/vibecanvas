import Konva from "konva";

type TCameraState = {
  x: number;
  y: number;
  scale: number;
};

/**
 * CameraSystem owns the world transform for the canvas.
 *
 * Instead of moving the whole Konva stage, we keep HUD/UI layers fixed and only
 * transform the world containers registered with this service. That makes panning
 * and future zooming predictable, and gives input systems a single place to
 * convert between screen coordinates and world coordinates.
 */
export class CameraSystem {
  #state: TCameraState = {
    x: 0,
    y: 0,
    scale: 1,
  };

  #targets = new Set<Konva.Node>();

  constructor(initialState?: Partial<TCameraState>) {
    if (initialState) {
      this.#state = {
        ...this.#state,
        ...initialState,
      };
    }
  }

  get state(): TCameraState {
    return { ...this.#state };
  }

  registerTarget(node: Konva.Node) {
    this.#targets.add(node);
    this.#applyTo(node);
  }

  unregisterTarget(node: Konva.Node) {
    this.#targets.delete(node);
  }

  setPosition(position: Pick<TCameraState, "x" | "y">) {
    this.#state.x = position.x;
    this.#state.y = position.y;
    this.#apply();
  }

  panBy(delta: { x: number; y: number }) {
    this.#state.x += delta.x;
    this.#state.y += delta.y;
    this.#apply();
  }

  setScale(scale: number) {
    this.#state.scale = scale;
    this.#apply();
  }

  zoomAtScreenPoint(args: { scale: number; screenPoint: Konva.Vector2d }) {
    const worldPointBeforeZoom = this.screenToWorld(args.screenPoint);

    this.#state.scale = args.scale;
    this.#state.x = args.screenPoint.x - worldPointBeforeZoom.x * this.#state.scale;
    this.#state.y = args.screenPoint.y - worldPointBeforeZoom.y * this.#state.scale;

    this.#apply();
  }

  screenToWorld(point: Konva.Vector2d): Konva.Vector2d {
    const target = this.#targets.values().next().value as Konva.Node | undefined;

    if (!target) return point;

    const transform = target.getAbsoluteTransform().copy();
    transform.invert();
    return transform.point(point);
  }

  worldToScreen(point: Konva.Vector2d): Konva.Vector2d {
    const target = this.#targets.values().next().value as Konva.Node | undefined;

    if (!target) return point;

    return target.getAbsoluteTransform().point(point);
  }

  #apply() {
    for (const target of this.#targets) {
      this.#applyTo(target);
    }
  }

  #applyTo(target: Konva.Node) {
    target.position({
      x: this.#state.x,
      y: this.#state.y,
    });
    target.scale({
      x: this.#state.scale,
      y: this.#state.scale,
    });
    target.getLayer()?.batchDraw();
  }
}
