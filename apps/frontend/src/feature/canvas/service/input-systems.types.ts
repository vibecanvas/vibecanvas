import Konva from "konva";
import type { TTool } from "@/feature/floating-canvas-toolbar";
import type { CameraSystem } from "./camera-system";

type TCanvasInputContext = {
  camera: CameraSystem;
  getActiveTool: () => TTool;
  overlayLayer: Konva.Layer;
  selectionRect: Konva.Rect;
  getSelectableNodes: () => Konva.Node[];
  setSelectedIds: (ids: string[]) => void;
};

export type { TCanvasInputContext };
