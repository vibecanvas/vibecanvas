export type TPoint = { x: number; y: number };

export type TTransformLike = {
  copy(): TTransformLike;
  invert(): TTransformLike;
  point(point: TPoint): TPoint;
};

export type TArgsGetWorldPosition = {
  absolutePosition: TPoint;
  parentTransform: TTransformLike | null;
};

export type TArgsGetAbsolutePositionFromWorldPosition = {
  worldPosition: TPoint;
  parentTransform: TTransformLike | null;
};

export function fxGetWorldPosition(args: TArgsGetWorldPosition) {
  if (!args.parentTransform) {
    return args.absolutePosition;
  }

  return args.parentTransform.copy().invert().point(args.absolutePosition);
}

export function fxGetAbsolutePositionFromWorldPosition(args: TArgsGetAbsolutePositionFromWorldPosition) {
  if (!args.parentTransform) {
    return args.worldPosition;
  }

  return args.parentTransform.copy().point(args.worldPosition);
}
