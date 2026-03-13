import type { TTool } from "./components/FloatingCanvasToolbar/toolbar.types";

export enum CustomEvents {
  GRID_VISIBLE = 'grid-visible',
  TOOL_SELECT = 'tool-select'
}

export type CustomEventMap = {
  [CustomEvents.GRID_VISIBLE]: boolean
  [CustomEvents.TOOL_SELECT]: TTool
}

export type TCustomEventName = keyof CustomEventMap & string;

export type TCustomEvent = {
  [K in TCustomEventName]: [K, CustomEventMap[K]];
}[TCustomEventName];
