import type { IPlugin, IPluginContext } from "./interface";

const ZOOM_STEP = 1.03;

/**
 * Pan, zoom, click drag
 */
export class CameraControlPlugin implements IPlugin {
  apply(context: IPluginContext): void {
    const { hooks, camera, stage } = context;

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
  }
}
