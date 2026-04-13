export type TArgsComputeHostedComponentOverlayFrame = {
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  insetPx: number;
  headerHeightPx: number;
};

export function fxComputeHostedComponentOverlayFrame(args: TArgsComputeHostedComponentOverlayFrame) {
  const width = Math.max(0, args.rect.width - args.insetPx * 2);
  const height = Math.max(0, args.rect.height - args.headerHeightPx - args.insetPx * 2);

  return {
    display: width <= 0 || height <= 0 ? "none" : "block",
    left: args.rect.x + args.insetPx,
    top: args.rect.y + args.headerHeightPx + args.insetPx,
    width,
    height,
  } as const;
}
