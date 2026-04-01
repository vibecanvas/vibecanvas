import type { IPlugin, IPluginContext } from "./interface";
import { createEffect } from "solid-js";
import { CanvasMode } from "../services/canvas/enum";

const ZOOM_STEP = 1.03;

/**
 * Pan, zoom, click drag
 */
export class CameraControlPlugin implements IPlugin {
  #handLayer: HTMLDivElement | null = null;
  #isHandDragging = false;
  #activePointerId: number | null = null;
  #lastPointer: { x: number; y: number } | null = null;

  apply(context: IPluginContext): void {
    const { hooks, camera, stage } = context;

    const resetHandState = () => {
      this.#isHandDragging = false;
      this.#activePointerId = null;
      this.#lastPointer = null;

      if (this.#handLayer) {
        this.#handLayer.style.cursor = context.state.mode === CanvasMode.HAND ? "grab" : "default";
      }
    };

    const handLayer = document.createElement("div");
    handLayer.className = "absolute inset-0";
    Object.assign(handLayer.style, {
      display: "none",
      pointerEvents: "none",
      background: "transparent",
      zIndex: "20",
      cursor: "grab",
      touchAction: "none",
    });
    stage.container().appendChild(handLayer);
    this.#handLayer = handLayer;

    const onHandPointerDown = (event: PointerEvent) => {
      if (context.state.mode !== CanvasMode.HAND) return;

      event.preventDefault();
      this.#isHandDragging = true;
      this.#activePointerId = event.pointerId;
      this.#lastPointer = { x: event.clientX, y: event.clientY };
      if (this.#handLayer && typeof this.#handLayer.setPointerCapture === "function") {
        this.#handLayer.setPointerCapture(event.pointerId);
      }

      if (this.#handLayer) {
        this.#handLayer.style.cursor = "grabbing";
      }
    };

    const onHandPointerMove = (event: PointerEvent) => {
      if (!this.#isHandDragging) return;
      if (this.#activePointerId !== event.pointerId) return;
      if (!this.#lastPointer) return;

      event.preventDefault();

      const deltaX = event.clientX - this.#lastPointer.x;
      const deltaY = event.clientY - this.#lastPointer.y;
      this.#lastPointer = { x: event.clientX, y: event.clientY };

      camera.pan(-deltaX, -deltaY);
      hooks.cameraChange.call();
    };

    const onHandPointerUp = (event: PointerEvent) => {
      if (this.#activePointerId !== event.pointerId) return;

      event.preventDefault();
      resetHandState();
    };

    const onHandLostPointerCapture = () => {
      resetHandState();
    };

    handLayer.addEventListener("pointerdown", onHandPointerDown);
    handLayer.addEventListener("pointermove", onHandPointerMove);
    handLayer.addEventListener("pointerup", onHandPointerUp);
    handLayer.addEventListener("pointercancel", onHandPointerUp);
    handLayer.addEventListener("lostpointercapture", onHandLostPointerCapture);

    hooks.init.tap(() => {
      createEffect(() => {
        const isHandMode = context.state.mode === CanvasMode.HAND;

        if (!this.#handLayer) return;

        if (!isHandMode) {
          if (
            this.#activePointerId !== null &&
            typeof this.#handLayer.hasPointerCapture === "function" &&
            typeof this.#handLayer.releasePointerCapture === "function" &&
            this.#handLayer.hasPointerCapture(this.#activePointerId)
          ) {
            this.#handLayer.releasePointerCapture(this.#activePointerId);
          }
          resetHandState();
        }

        this.#handLayer.style.display = isHandMode ? "block" : "none";
        this.#handLayer.style.pointerEvents = isHandMode ? "auto" : "none";
        this.#handLayer.style.cursor = this.#isHandDragging ? "grabbing" : isHandMode ? "grab" : "default";
      });
    });

    hooks.pointerWheel.tap(e => {
      if (e.evt.ctrlKey) {
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        e.evt.preventDefault();

        const direction = e.evt.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
        camera.zoomAtScreenPoint(camera.zoom * direction, pointer);
        hooks.cameraChange.call();
        return;
      }

      e.evt.preventDefault();
      camera.pan(e.evt.deltaX, e.evt.deltaY);
      hooks.cameraChange.call();
    });

    hooks.destroy.tap(() => {
      if (
        this.#handLayer &&
        this.#activePointerId !== null &&
        typeof this.#handLayer.hasPointerCapture === "function" &&
        typeof this.#handLayer.releasePointerCapture === "function" &&
        this.#handLayer.hasPointerCapture(this.#activePointerId)
      ) {
        this.#handLayer.releasePointerCapture(this.#activePointerId);
      }

      resetHandState();
      handLayer.removeEventListener("pointerdown", onHandPointerDown);
      handLayer.removeEventListener("pointermove", onHandPointerMove);
      handLayer.removeEventListener("pointerup", onHandPointerUp);
      handLayer.removeEventListener("pointercancel", onHandPointerUp);
      handLayer.removeEventListener("lostpointercapture", onHandLostPointerCapture);
      handLayer.remove();
      this.#handLayer = null;
    });
  }
}
