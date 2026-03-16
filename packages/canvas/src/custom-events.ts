import type { KonvaEventObject } from "konva/lib/Node";
import type { Shape, ShapeConfig } from "konva/lib/Shape";
import type { TTool } from "./components/FloatingCanvasToolbar/toolbar.types";
import type { Group } from "konva/lib/Group";

export enum CustomEvents {
  GRID_VISIBLE = 'grid-visible',
  TOOL_SELECT = 'tool-select',
  ELEMENT_POINTERDOWN = 'element-pointerdown'
}

export type CustomEventMap = {
  [CustomEvents.GRID_VISIBLE]: boolean
  [CustomEvents.TOOL_SELECT]: TTool
  [CustomEvents.ELEMENT_POINTERDOWN]: KonvaEventObject<PointerEvent, Shape<ShapeConfig> | Group>
}

export type TCustomEventName = keyof CustomEventMap & string;

export type TCustomEvent = {
  [K in TCustomEventName]: [K, CustomEventMap[K]];
}[TCustomEventName];
