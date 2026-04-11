import type { IPlugin } from "@vibecanvas/runtime";
import type { TTool } from "../../components/FloatingCanvasToolbar/toolbar.types";
import type { CameraService } from "../../new-services/camera/CameraService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { IHooks } from "../../runtime";
import { fxGetHandLayerStyle } from "./fn.get-hand-layer-style";
import { fxGetPointerDelta } from "./fn.get-pointer-delta";
import { txSyncHandLayer } from "./tx.sync-hand-layer";

const ZOOM_STEP = 1.03;

/**
 * Owns camera pan and zoom input behavior.
 * Keeps hand-drag overlay local to camera control behavior.
 */
export function createCameraControlPlugin(): IPlugin<{
  camera: CameraService;
  render: RenderService;
}, IHooks> {
  let handLayer: HTMLDivElement | null = null;
  let isHandDragging = false;
  let activePointerId: number | null = null;
  let lastPointer: { x: number; y: number } | null = null;
  let activeTool: TTool = "select";

  function isHandTool() {
    return activeTool === "hand";
  }

  function resetHandState() {
    isHandDragging = false;
    activePointerId = null;
    lastPointer = null;

    if (handLayer) {
      const style = fxGetHandLayerStyle({
        isHandTool: isHandTool(),
        isHandDragging,
      });
      txSyncHandLayer({ handLayer }, style);
    }
  }

  function syncHandLayer() {
    if (!handLayer) {
      return;
    }

    const handMode = isHandTool();
    if (!handMode) {
      if (
        activePointerId !== null
        && typeof handLayer.hasPointerCapture === "function"
        && typeof handLayer.releasePointerCapture === "function"
        && handLayer.hasPointerCapture(activePointerId)
      ) {
        handLayer.releasePointerCapture(activePointerId);
      }
      resetHandState();
    }

    const style = fxGetHandLayerStyle({
      isHandTool: handMode,
      isHandDragging,
    });
    txSyncHandLayer({ handLayer }, style);
  }

  return {
    name: "camera-control",
    apply(ctx) {
      const camera = ctx.services.require("camera");
      const render = ctx.services.require("render");

      ctx.hooks.init.tap(() => {
        handLayer = document.createElement("div");
        handLayer.className = "absolute inset-0";
        Object.assign(handLayer.style, {
          display: "none",
          pointerEvents: "none",
          background: "transparent",
          zIndex: "20",
          cursor: "grab",
          touchAction: "none",
        });

        const onHandPointerDown = (event: PointerEvent) => {
          if (!isHandTool()) return;

          event.preventDefault();
          isHandDragging = true;
          activePointerId = event.pointerId;
          lastPointer = { x: event.clientX, y: event.clientY };
          if (handLayer && typeof handLayer.setPointerCapture === "function") {
            handLayer.setPointerCapture(event.pointerId);
          }

          if (handLayer) {
            handLayer.style.cursor = "grabbing";
          }
        };

        const onHandPointerMove = (event: PointerEvent) => {
          if (!isHandDragging) return;
          if (activePointerId !== event.pointerId) return;
          if (!lastPointer) return;

          event.preventDefault();

          const nextPointer = { x: event.clientX, y: event.clientY };
          const { deltaX, deltaY } = fxGetPointerDelta({
            lastPointer,
            nextPointer,
          });
          lastPointer = nextPointer;

          camera.pan(-deltaX, -deltaY);
        };

        const onHandPointerUp = (event: PointerEvent) => {
          if (activePointerId !== event.pointerId) return;

          event.preventDefault();
          resetHandState();
        };

        const onHandLostPointerCapture = () => {
          resetHandState();
        };

        render.stage.container().appendChild(handLayer);
        handLayer.addEventListener("pointerdown", onHandPointerDown);
        handLayer.addEventListener("pointermove", onHandPointerMove);
        handLayer.addEventListener("pointerup", onHandPointerUp);
        handLayer.addEventListener("pointercancel", onHandPointerUp);
        handLayer.addEventListener("lostpointercapture", onHandLostPointerCapture);
        syncHandLayer();

        ctx.hooks.destroy.tap(() => {
          if (
            handLayer
            && activePointerId !== null
            && typeof handLayer.hasPointerCapture === "function"
            && typeof handLayer.releasePointerCapture === "function"
            && handLayer.hasPointerCapture(activePointerId)
          ) {
            handLayer.releasePointerCapture(activePointerId);
          }

          resetHandState();
          handLayer?.removeEventListener("pointerdown", onHandPointerDown);
          handLayer?.removeEventListener("pointermove", onHandPointerMove);
          handLayer?.removeEventListener("pointerup", onHandPointerUp);
          handLayer?.removeEventListener("pointercancel", onHandPointerUp);
          handLayer?.removeEventListener("lostpointercapture", onHandLostPointerCapture);
          handLayer?.remove();
          handLayer = null;
        });
      });

      ctx.hooks.toolSelect.tap((tool) => {
        activeTool = tool;
        syncHandLayer();
      });

      ctx.hooks.pointerWheel.tap((event) => {
        if (event.evt.ctrlKey) {
          const pointer = render.stage.getPointerPosition();
          if (!pointer) return;

          event.evt.preventDefault();

          const direction = event.evt.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
          camera.zoomAtScreenPoint(camera.zoom * direction, pointer);
          return;
        }

        event.evt.preventDefault();
        camera.pan(event.evt.deltaX, event.evt.deltaY);
      });
    },
  };
}
