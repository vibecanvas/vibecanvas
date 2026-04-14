import type { TElementStyle } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { DEFAULT_FILL, DEFAULT_STROKE_WIDTH } from "./CONSTANTS";

export function fxGetPenStrokeWidthFromStyle(args: {
  style: TElementStyle;
}) {
  return args.style.strokeWidth ?? DEFAULT_STROKE_WIDTH;
}

export function fxGetPenColorStyleKey(args: {
  style: TElementStyle;
}): "backgroundColor" | "strokeColor" {
  if (typeof args.style.strokeColor === "string" && typeof args.style.backgroundColor !== "string") {
    return "strokeColor";
  }

  return "backgroundColor";
}

export function fxCreatePenStyleFromNode(args: {
  nodeFill: string;
  opacity: number;
  strokeWidth: number;
  baseStyle: TElementStyle;
}): TElementStyle {
  const fill = args.nodeFill || DEFAULT_FILL;
  const style: TElementStyle = {
    ...structuredClone(args.baseStyle),
    opacity: args.opacity,
    strokeWidth: args.strokeWidth || DEFAULT_STROKE_WIDTH,
  };

  const colorStyleKey = fxGetPenColorStyleKey({ style: args.baseStyle });
  delete style.backgroundColor;
  delete style.strokeColor;
  style[colorStyleKey] = typeof args.baseStyle[colorStyleKey] === "string" ? args.baseStyle[colorStyleKey] : fill;

  return style;
}
