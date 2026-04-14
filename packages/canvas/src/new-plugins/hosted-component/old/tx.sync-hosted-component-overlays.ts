import { fxComputeHostedComponentOverlayFrame } from "./fn.compute-hosted-component-overlay-frame";
import type { RenderService } from "../../new-services/render/RenderService";
import type Konva from "konva";

export type TPortalSyncHostedComponentOverlays = {
  render: RenderService;
};

export type TArgsSyncHostedComponentOverlays = {
  root: HTMLDivElement;
  overlays: Map<string, HTMLDivElement>;
  kind: string;
  groupKindAttr: string;
  overlayInsetPx: number;
  headerHeightPx: number;
  overlayBackground: string;
  overlayBorder: string;
  onCreateOverlay?: (overlay: HTMLDivElement) => void;
  onMountOverlay?: (overlay: HTMLDivElement) => void;
};

function getHostedComponentNodes(render: RenderService, kind: string, groupKindAttr: string) {
  return render.staticForegroundLayer.find((candidate: Konva.Node) => {
    return candidate instanceof render.Group && candidate.getAttr(groupKindAttr) === kind;
  }).filter((candidate): candidate is Konva.Group => candidate instanceof render.Group);
}

export function txSyncHostedComponentOverlays(portal: TPortalSyncHostedComponentOverlays, args: TArgsSyncHostedComponentOverlays) {
  const activeIds = new Set<string>();

  getHostedComponentNodes(portal.render, args.kind, args.groupKindAttr).forEach((node) => {
    const id = node.id();
    activeIds.add(id);

    let overlay = args.overlays.get(id);
    if (!overlay) {
      overlay = portal.render.container.ownerDocument.createElement("div");
      overlay.dataset.hostedComponentOverlayId = id;
      overlay.style.position = "absolute";
      overlay.style.pointerEvents = "none";
      overlay.style.background = args.overlayBackground;
      overlay.style.border = args.overlayBorder;
      overlay.style.boxSizing = "border-box";
      args.root.appendChild(overlay);
      args.onCreateOverlay?.(overlay);
      args.overlays.set(id, overlay);
    }

    const rect = node.getClientRect();
    const scale = node.getAbsoluteScale();
    const frame = fxComputeHostedComponentOverlayFrame({
      rect,
      scale,
      insetPx: args.overlayInsetPx,
      headerHeightPx: args.headerHeightPx,
    });

    overlay.style.display = frame.display;
    overlay.style.left = `${frame.left}px`;
    overlay.style.top = `${frame.top}px`;
    overlay.style.width = `${frame.width}px`;
    overlay.style.height = `${frame.height}px`;
    overlay.style.overflow = "hidden";
    overlay.style.setProperty("--vc-hosted-component-scale-x", `${scale.x}`);
    overlay.style.setProperty("--vc-hosted-component-scale-y", `${scale.y}`);

    if (frame.display === "block" && overlay.childElementCount === 0 && overlay.clientWidth > 0 && overlay.clientHeight > 0) {
      args.onMountOverlay?.(overlay);
    }
  });

  for (const [id, overlay] of args.overlays.entries()) {
    if (activeIds.has(id)) {
      continue;
    }

    overlay.remove();
    args.overlays.delete(id);
  }
}
