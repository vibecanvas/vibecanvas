/**
 * Mode is important for different plugins when to ignore or not some events
 */
export enum CanvasMode {
  SELECT = 'select',
  HAND = 'hand',
  DRAW_CREATE = 'draw-create',
  CLICK_CREATE = 'click-create',
}

export enum Theme {
  LIGHT,
  DARK,
}
