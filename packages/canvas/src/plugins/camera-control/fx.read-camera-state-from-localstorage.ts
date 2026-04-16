import type { TCameraViewport } from "../../services/camera/CameraService";
import { CAMERA_VIEWPORTS_LOCAL_STORAGE_KEY } from "./CONSTANTS";
import { fxNormalizeCameraState } from "./fn.normalize-camera-state";

export type TPortalReadCameraState = {
  storage: Pick<Storage, "getItem"> | null;
};

export type TArgsReadCameraState = {
  canvasId: string;
};

type TStoredCameraViewportMap = Record<string, unknown>;

export function fxReadCameraStateFromLocalStorage(portal: TPortalReadCameraState, args: TArgsReadCameraState): TCameraViewport | null {
  if (portal.storage === null) {
    return null;
  }

  try {
    const rawValue = portal.storage.getItem(CAMERA_VIEWPORTS_LOCAL_STORAGE_KEY);
    if (rawValue === null) {
      return null;
    }

    const storedViewports = JSON.parse(rawValue) as TStoredCameraViewportMap | null;
    if (!storedViewports || typeof storedViewports !== "object") {
      return fxNormalizeCameraState({ value: null });
    }

    if (!(args.canvasId in storedViewports)) {
      return null;
    }

    return fxNormalizeCameraState({ value: storedViewports[args.canvasId] });
  } catch {
    return fxNormalizeCameraState({ value: null });
  }
}
