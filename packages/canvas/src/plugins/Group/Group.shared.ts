import Konva from "konva";

export type GroupSelectionNode = Konva.Group | Konva.Shape;

export type GroupBoundary = {
  node: Konva.Rect;
  update: () => void;
  show: () => void;
  hide: () => void;
  getBoundaryBox: () => { x: number; y: number; width: number; height: number };
};
