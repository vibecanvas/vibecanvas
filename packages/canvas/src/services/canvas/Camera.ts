
export class Camera {
  #x: number = 0;
  #y: number = 0;
  #zoom: number = 1;

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
}