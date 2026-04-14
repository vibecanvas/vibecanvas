import type { RenderService } from "../../../new-services/render/RenderService";

export type TPortalGetHostedComponentCreatePointer = {
  render: RenderService;
};

export type TArgsGetHostedComponentCreatePointer = {};

export function fxGetHostedComponentCreatePointer(portal: TPortalGetHostedComponentCreatePointer, args: TArgsGetHostedComponentCreatePointer) {
  void args;
  return portal.render.staticForegroundLayer.getRelativePointerPosition();
}
