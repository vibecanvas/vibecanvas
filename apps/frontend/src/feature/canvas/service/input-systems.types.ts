import Konva from "konva";
import type { TTool } from "@/feature/floating-canvas-toolbar";
import type { CameraSystem } from "./camera-system";
import type { TStrokePoint } from "./stroke-renderer";

type TCanvasInputContext = {
  camera: CameraSystem;
  getActiveTool: () => TTool;
  overlayLayer: Konva.Layer;
  selectionRect: Konva.Rect;
  getSelectableNodes: () => Konva.Node[];
  setSelectedIds: (ids: string[]) => void;
  beginStrokePreview: (point: TStrokePoint) => void;
  updateStrokePreview: (points: TStrokePoint[]) => void;
  commitStroke: (points: TStrokePoint[]) => void;
  cancelStrokePreview: () => void;
};

export type { TCanvasInputContext };
