import type { ThemeId, TThemeDefinition } from "./builtins";

export const THEME_COLOR_FAMILIES = [
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "blue",
  "purple",
  "pink",
  "brown",
] as const;

export const THEME_COLOR_STEPS = ["100", "300", "500", "700", "900"] as const;

export type TThemeColorFamily = typeof THEME_COLOR_FAMILIES[number];
export type TThemeColorStep = typeof THEME_COLOR_STEPS[number];
export type TThemeColorToken = "@transparent" | `@${TThemeColorFamily}/${TThemeColorStep}`;
export type TThemeColorScale = Record<TThemeColorStep, string>;
export type TThemeColorPalette = Record<TThemeColorFamily, TThemeColorScale>;

export type TThemeColorSwatch = {
  token: TThemeColorToken;
  label: string;
  color: string;
};

export type TThemeColorPaletteGroup = {
  id: TThemeColorFamily;
  label: string;
  swatches: TThemeColorSwatch[];
};

export type TThemeColorPickerPalette = {
  fillQuick: TThemeColorSwatch[];
  strokeQuick: TThemeColorSwatch[];
  groups: TThemeColorPaletteGroup[];
};

export type TCanvasThemeStyle = {
  id: ThemeId;
  base: TThemeDefinition;
  palette: TThemeColorPalette;
  fillQuick: readonly TThemeColorToken[];
  strokeQuick: readonly TThemeColorToken[];
};
