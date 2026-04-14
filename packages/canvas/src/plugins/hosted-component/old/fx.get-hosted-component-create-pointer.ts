import type { SceneService } from "../../../services/scene/SceneService";

export type TPortalGetHostedComponentCreatePointer = {
  render: SceneService;
};

export type TArgsGetHostedComponentCreatePointer = {};

export function fxGetHostedComponentCreatePointer(portal: TPortalGetHostedComponentCreatePointer, args: TArgsGetHostedComponentCreatePointer) {
  void args;
  return portal.render.staticForegroundLayer.getRelativePointerPosition();
}
