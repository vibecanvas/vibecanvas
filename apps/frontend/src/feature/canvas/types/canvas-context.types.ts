import Konva from "konva";
import type { TElementData, TElementStyle } from "@vibecanvas/shell/automerge/index";
import type { TTool } from "../components/toolbar.types";
import type { CameraSystem } from "../managers/camera.manager";
import type { SelectionManager } from "../managers/selection.manager";

type TCanvasElementDraft = {
  id?: string;
  x: number;
  y: number;
  angle?: number;
  parentGroupId?: string | null;
  locked?: boolean;
  data: TElementData;
  style?: TElementStyle;
};

type TCanvasInputContext = {
  camera: CameraSystem;
  overlayRoot: HTMLDivElement;
  getActiveTool: () => TTool;
  setActiveTool: (tool: TTool) => void;
  setTemporaryTool: (tool: TTool | null) => void;
  getGridVisible: () => boolean;
  toggleGridVisible: () => void;
  getSidebarVisible: () => boolean;
  toggleSidebarVisible: () => void;
  openImagePicker: () => void;
  selection: SelectionManager;
  getSelectableNodes: () => Konva.Node[];
  mountPreviewNode: (ownerId: string, node: Konva.Shape | Konva.Group) => void;
  unmountPreviewNode: (ownerId: string) => void;
  suppressNextClickSelection: () => void;
  createElement: (draft: TCanvasElementDraft) => void;
};

export type { TCanvasElementDraft, TCanvasInputContext };
