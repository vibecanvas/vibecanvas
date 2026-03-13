import type { IPlugin, IPluginContext } from "./interface";

/**
 * Pan, zoom, click drag
 */
export class CameraControlPlugin implements IPlugin {
  apply(context: IPluginContext): void {
    const { hooks, camera } = context;

    hooks.pointerWheel.tap(e => {
      e.evt.preventDefault();
      camera.pan(e.evt.deltaX, e.evt.deltaY);
      hooks.cameraChange.call();
    });
  }
}
