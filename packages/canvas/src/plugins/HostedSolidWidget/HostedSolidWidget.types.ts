import type Konva from "konva";
import type { TTool } from "../../components/FloatingCanvasToolbar/toolbar.types";
import type { THostedWidgetChrome, THostedWidgetElementMap, THostedWidgetType } from "../../services/canvas/interface";

export type { THostedWidgetChrome, THostedWidgetElementMap, THostedWidgetType };

export type THostedWidgetElement = THostedWidgetElementMap[THostedWidgetType];

export type TDroppedNode = {
  path: string;
  name: string;
  is_dir: boolean;
};

export type TMountRecord = {
  node: Konva.Rect;
  mountElement: HTMLDivElement;
  dispose: () => void;
  setElement: (element: THostedWidgetElement) => void;
  setWindowChrome: (chrome: THostedWidgetChrome | null) => void;
  beforeRemove: () => void | Promise<void>;
  setBeforeRemove: (handler: (() => void | Promise<void>) | null) => void;
  setAutoSize: (handler: ((size: { width: number; height: number }) => void) | null) => void;
};

export type THostedWidgetTool = TTool;
