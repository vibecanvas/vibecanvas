import type { TArrowData, TElement, TLineData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";

export type TShape1dData = TLineData | TArrowData;
export type TShape1dTool = "line" | "arrow";
export type TPoint = [number, number];
export type TShape1dNode = Konva.Shape & {
  getSelfRect(): { x: number; y: number; width: number; height: number };
};
export type THandleDragSnapshot = {
  nodeId: string;
  pointIndex: number;
  beforeElement: TElement;
  beforePoints: TPoint[];
  beforeAbsoluteTransform: Konva.Transform;
};

export const ELEMENT_CREATED_AT_ATTR = "vcElementCreatedAt";
export const DEFAULT_STROKE = "#0f172a";
export const DEFAULT_OPACITY = 0.92;
export const DEFAULT_STROKE_WIDTH = 4;
export const MIN_HIT_STROKE_WIDTH = 16;
export const CURVE_TENSION = 1;
export const EDIT_HANDLE_RADIUS = 7;
export const INSERT_HANDLE_RADIUS = 6;
export const EDIT_HANDLE_STROKE = "#6366f1";
export const EDIT_HANDLE_FILL = "#ffffff";
