import {
  BUILTIN_THEMES,
  type ThemeId,
  type TThemeDefinition,
} from "./builtins";
import type {
  TCanvasThemeStyle,
  TThemeColorFamily,
  TThemeColorScale,
  TThemeColorStep,
  TThemeColorToken,
} from "./types";

const DEFAULT_FILL_QUICK = [
  "@transparent",
  "@gray/100",
  "@red/300",
  "@green/300",
  "@blue/300",
  "@yellow/300",
] as const satisfies readonly TThemeColorToken[];

const DEFAULT_STROKE_QUICK = [
  "@gray/900",
  "@red/700",
  "@green/700",
  "@blue/700",
  "@yellow/700",
] as const satisfies readonly TThemeColorToken[];

export function getBaseThemeOrThrow(themeId: ThemeId): TThemeDefinition {
  const theme = BUILTIN_THEMES.find((candidate) => candidate.id === themeId);
  if (!theme) {
    throw new Error(`Missing base theme '${themeId}'`);
  }

  return structuredClone(theme);
}

export function createColorScale(
  c100: string,
  c300: string,
  c500: string,
  c700: string,
  c900: string,
): TThemeColorScale {
  return {
    "100": c100,
    "300": c300,
    "500": c500,
    "700": c700,
    "900": c900,
  } satisfies Record<TThemeColorStep, string>;
}

export function createThemeStyle(args: {
  id: ThemeId;
  palette: Record<TThemeColorFamily, TThemeColorScale>;
  fillQuick?: readonly TThemeColorToken[];
  strokeQuick?: readonly TThemeColorToken[];
}): TCanvasThemeStyle {
  return {
    id: args.id,
    base: getBaseThemeOrThrow(args.id),
    palette: args.palette,
    fillQuick: args.fillQuick ?? DEFAULT_FILL_QUICK,
    strokeQuick: args.strokeQuick ?? DEFAULT_STROKE_QUICK,
  };
}
