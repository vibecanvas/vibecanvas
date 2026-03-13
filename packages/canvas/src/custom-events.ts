
export enum CustomEvents {
  GRID_VISIBLE = 'grid-visible'
}

export type CustomEventMap = {
  [CustomEvents.GRID_VISIBLE]: boolean
}

export type TCustomEventName = keyof CustomEventMap & string;

export type TCustomEvent = {
  [K in TCustomEventName]: [K, CustomEventMap[K]];
}[TCustomEventName];
