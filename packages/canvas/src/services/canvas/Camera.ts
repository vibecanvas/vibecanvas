import type Konva from "konva";

export class Camera {
  #dynamicLayer: Konva.Layer;
  #x: number = 0;
  #y: number = 0;
  #zoom: number = 1;

  constructor(dynamicLayer: Konva.Layer) {
    this.#dynamicLayer = dynamicLayer;
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
    this.#zoom = value;
  }

  pan(deltaX: number, deltaY: number) {
    const nextX = this.#x - deltaX;
    const nextY = this.#y - deltaY;

    this.#x = nextX;
    this.#y = nextY;
    this.#dynamicLayer.position({ x: nextX, y: nextY });
    this.#dynamicLayer.batchDraw();
  }
}
