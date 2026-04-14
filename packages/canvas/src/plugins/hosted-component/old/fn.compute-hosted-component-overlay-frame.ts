export type TArgsComputeHostedComponentOverlayFrame = {
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  scale: {
    x: number;
    y: number;
  };
  insetPx: number;
  headerHeightPx: number;
};

export function fxComputeHostedComponentOverlayFrame(args: TArgsComputeHostedComponentOverlayFrame) {
  const insetX = args.insetPx * args.scale.x;
  const insetY = args.insetPx * args.scale.y;
  const headerHeight = args.headerHeightPx * args.scale.y;
  const width = Math.max(0, args.rect.width - insetX * 2);
  const height = Math.max(0, args.rect.height - headerHeight - insetY * 2);

  return {
    display: width <= 0 || height <= 0 ? "none" : "block",
    left: args.rect.x + insetX,
    top: args.rect.y + headerHeight + insetY,
    width,
    height,
  } as const;
}
