import { Canvas, FabricText } from "fabric";
import type { TCanvasPointerInput, TCanvasPointerPhase, TCanvasPointerType } from "../input/pointer.types";

type TPointerEventListener = (event: TCanvasPointerInput) => void;

export class RenderEngine {
  #canvas = new Canvas();
  #resizeObserver: ResizeObserver | null = null;
  #handleResize!: () => void;
  #onPointerInput: TPointerEventListener;

  constructor(canvasRef: HTMLCanvasElement, onPointerInput: TPointerEventListener) {
    this.#onPointerInput = onPointerInput;
    this.#canvas = new Canvas(canvasRef, {
      enablePointerEvents: true,
    });



    const helloWorld = new FabricText("Hello world!");
    helloWorld.on('moving', () => console.log(helloWorld.getRelativeCenterPoint()))
    this.#canvas.add(helloWorld);
    this.#canvas.centerObject(helloWorld);

    this.#setupResize()
    this.#setupPointerEvents()

  }

  #setupPointerEvents() {
    this.#canvas.on("mouse:down", (event) => {
      this.#emitPointerInput("down", event.e);
    });
    this.#canvas.on("mouse:move", (event) => {
      this.#emitPointerInput("move", event.e);
    });
    this.#canvas.on("mouse:up", (event) => {
      this.#emitPointerInput("up", event.e);
    });
  }

  #emitPointerInput(phase: TCanvasPointerPhase, nativeEvent: Event | undefined): void {
    if (!(nativeEvent instanceof PointerEvent)) {
      return;
    }

    const viewportPoint = this.#canvas.getViewportPoint(nativeEvent);
    const scenePoint = this.#canvas.getScenePoint(nativeEvent);

    const pointerInput: TCanvasPointerInput = {
      phase,
      pointerId: nativeEvent.pointerId,
      pointerType: this.#normalizePointerType(nativeEvent.pointerType),
      isPrimary: nativeEvent.isPrimary,
      button: nativeEvent.button,
      buttons: nativeEvent.buttons,
      pressure: nativeEvent.pressure,
      clientX: viewportPoint.x,
      clientY: viewportPoint.y,
      canvasX: scenePoint.x,
      canvasY: scenePoint.y,
      altKey: nativeEvent.altKey,
      ctrlKey: nativeEvent.ctrlKey,
      metaKey: nativeEvent.metaKey,
      shiftKey: nativeEvent.shiftKey,
      timestamp: nativeEvent.timeStamp,
    };
    this.#onPointerInput(pointerInput);
  }

  #normalizePointerType(pointerType: string): TCanvasPointerType {
    if (pointerType === "touch" || pointerType === "pen") {
      return pointerType;
    }

    return "mouse";
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
