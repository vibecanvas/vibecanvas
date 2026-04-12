/**
 * Mode is important for different plugins when to ignore or not some events
 */
export enum CanvasMode {
  SELECT = 'select',
  HAND = 'hand',
  DRAW_CREATE = 'draw-create',
  CLICK_CREATE = 'click-create',
}

export {
  DEFAULT_THEME_ID,
  THEME_ID_DARK,
  THEME_ID_GRAPHITE,
  THEME_ID_LIGHT,
  THEME_ID_SEPIA,
  type ThemeId,
} from "@vibecanvas/service-theme";
