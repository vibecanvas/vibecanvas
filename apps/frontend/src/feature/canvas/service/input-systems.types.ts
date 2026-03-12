import Konva from "konva";
import type { TTool } from "../components/toolbar.types";
import type { CameraSystem } from "../managers/camera.manager";
import type { TStrokePoint } from "../utils/stroke-renderer";

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
