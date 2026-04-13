export const DEFAULT_STROKE_WIDTHS = [
  { name: "Thin", value: 1 },
  { name: "Medium", value: 2 },
  { name: "Thick", value: 4 },
] as const;

export const PEN_STROKE_WIDTHS = [
  { name: "Thin", value: 3 },
  { name: "Medium", value: 7 },
  { name: "Thick", value: 12 },
] as const;

export const FONT_FAMILIES = [
  { name: "Sans", value: "Arial, sans-serif" },
  { name: "Mono", value: "monospace" },
  { name: "Serif", value: "Georgia, serif" },
] as const;

export const LINE_TYPES = [
  { name: "Straight", value: "straight" },
  { name: "Curved", value: "curved" },
] as const;

export const CAP_STYLES = [
  { name: "None", value: "none" },
  { name: "Arrow", value: "arrow" },
  { name: "Dot", value: "dot" },
  { name: "Diamond", value: "diamond" },
] as const;

export type TStrokeWidthOption = {
  name: string;
  value: number;
};

export type TFontFamily = typeof FONT_FAMILIES[number]["value"];
export type TLineType = typeof LINE_TYPES[number]["value"];
export type TCapStyle = typeof CAP_STYLES[number]["value"];
