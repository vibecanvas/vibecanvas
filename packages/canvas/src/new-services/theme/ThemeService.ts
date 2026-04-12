import {
  ThemeService as BaseThemeService,
  BUILTIN_THEMES,
  DEFAULT_THEME_ID,
  THEME_ID_DARK,
  THEME_ID_GRAPHITE,
  THEME_ID_LIGHT,
  THEME_ID_SEPIA,
  type ThemeId,
  type TThemeColors,
  type TThemeDefinition,
  type TThemeServiceArgs,
  type TThemeServiceHooks,
  fxGetThemeCssVariables,
  txApplyThemeToElement,
} from "@vibecanvas/service-theme";
import {
  BUILTIN_THEME_STYLES,
  getThemeColorPickerPalette,
  getThemeStyle,
  isThemeColorToken,
  resolveThemeColor,
} from "./styles";
import type {
  TCanvasThemeStyle,
  TThemeColorFamily,
  TThemeColorPalette,
  TThemeColorPaletteGroup,
  TThemeColorPickerPalette,
  TThemeColorScale,
  TThemeColorStep,
  TThemeColorSwatch,
  TThemeColorToken,
} from "./types";

declare module "@vibecanvas/service-theme" {
  interface ThemeService {
    getCanvasThemeStyle(): TCanvasThemeStyle;
    resolveThemeColor(value: string | undefined, fallback?: string): string | undefined;
    getThemeColorPickerPalette(): TThemeColorPickerPalette;
  }
}

const themePrototype = BaseThemeService.prototype as BaseThemeService & {
  getCanvasThemeStyle?: () => TCanvasThemeStyle;
  resolveThemeColor?: (value: string | undefined, fallback?: string) => string | undefined;
  getThemeColorPickerPalette?: () => TThemeColorPickerPalette;
};

if (typeof themePrototype.getCanvasThemeStyle !== "function") {
  themePrototype.getCanvasThemeStyle = function getCanvasThemeStyleFromService() {
    return getThemeStyle(this.getTheme());
  };
}

if (typeof themePrototype.resolveThemeColor !== "function") {
  themePrototype.resolveThemeColor = function resolveThemeColorFromService(value: string | undefined, fallback?: string) {
    return resolveThemeColor(this.getTheme(), value, fallback);
  };
}

if (typeof themePrototype.getThemeColorPickerPalette !== "function") {
  themePrototype.getThemeColorPickerPalette = function getThemeColorPickerPaletteFromService() {
    return getThemeColorPickerPalette(this.getTheme());
  };
}

export {
  BaseThemeService as ThemeService,
  BUILTIN_THEMES,
  DEFAULT_THEME_ID,
  THEME_ID_DARK,
  THEME_ID_GRAPHITE,
  THEME_ID_LIGHT,
  THEME_ID_SEPIA,
  type ThemeId,
  type TThemeColors,
  type TThemeDefinition,
  type TThemeServiceArgs,
  type TThemeServiceHooks,
  fxGetThemeCssVariables,
  txApplyThemeToElement,
};
export {
  BUILTIN_THEME_STYLES,
  getThemeColorPickerPalette,
  getThemeStyle,
  isThemeColorToken,
  resolveThemeColor,
};
export type {
  TCanvasThemeStyle,
  TThemeColorFamily,
  TThemeColorPalette,
  TThemeColorPaletteGroup,
  TThemeColorPickerPalette,
  TThemeColorScale,
  TThemeColorStep,
  TThemeColorSwatch,
  TThemeColorToken,
};
