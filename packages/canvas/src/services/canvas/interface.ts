import { CanvasMode, Theme } from "./enum";

interface IThemeColors {
  /**
   * Background color of page.
   */
  background: string;
  /**
   * Color of grid.
   */
  grid: string;
  /**
   * Fill color of the selection brush.
   */
  selectionBrushFill: string;
  /**
   * Stroke color of the selection brush.
   */
  selectionBrushStroke: string;
}

export interface ICanvasConfig {
  /**
   * Default to `CanvasMode.HAND`.
   */
  mode?: CanvasMode;
  /**
   * Theme.
   */
  theme?: Theme;
  /**
   * Theme colors.
   * @see https://github.com/dgmjs/dgmjs/blob/main/packages/core/src/colors.ts#L130
   */
  themeColors?: Partial<{
    [Theme.LIGHT]: Partial<IThemeColors>;
    [Theme.DARK]: Partial<IThemeColors>;
  }>;
}