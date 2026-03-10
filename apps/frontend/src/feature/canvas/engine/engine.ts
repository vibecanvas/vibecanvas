import { Canvas, FabricText } from "fabric";

export class RenderEngine {
  #canvas = new Canvas();
  #resizeObserver: ResizeObserver | null = null;
  #handleResize!: () => void;

  constructor(canvasRef: HTMLCanvasElement) {
    this.#canvas = new Canvas(canvasRef);



    const helloWorld = new FabricText("Hello world!");
    helloWorld.on('moving', () => console.log(helloWorld.getRelativeCenterPoint()))
    this.#canvas.add(helloWorld);
    this.#canvas.centerObject(helloWorld);

    this.#setupResize()

  }

  #setupResize() {
    this.#handleResize = () => {
      const width = Math.round(this.#canvas.getElement().parentElement!.parentElement!.clientWidth);
      const height = Math.round(this.#canvas.getElement().parentElement!.parentElement!.clientHeight);

      if (width <= 0 || height <= 0) return;

      this.#canvas.setDimensions({ width, height });
      this.#canvas.calcOffset();
      this.#canvas.requestRenderAll();
    };
    this.#handleResize();
    this.#resizeObserver = new ResizeObserver(this.#handleResize);
    this.#resizeObserver.observe(this.#canvas.getElement().parentElement!);
    window.addEventListener("resize", this.#handleResize);
  }

  destroy(): void {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    window.removeEventListener("resize", this.#handleResize);
    this.#canvas.dispose();
  }
}
