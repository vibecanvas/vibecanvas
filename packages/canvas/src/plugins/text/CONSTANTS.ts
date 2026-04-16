export const DEFAULT_TEXT_FONT_FAMILY = "Arial";
export const DEFAULT_TEXT_FONT_SIZE = 16;
export const DEFAULT_TEXT_FONT_SIZE_TOKEN = "@text/s" as const;
export const DEFAULT_TEXT_LINE_HEIGHT = 1.2;
export const DEFAULT_TEXT_ALIGN = "left" as const;
export const DEFAULT_TEXT_VERTICAL_ALIGN = "top" as const;
export const DEFAULT_ATTACHED_TEXT_ALIGN = "center" as const;
export const DEFAULT_ATTACHED_TEXT_VERTICAL_ALIGN = "middle" as const;

export const TEXT_FONT_SIZE_TOKEN_BY_PRESET = {
  S: "@text/s",
  M: "@text/m",
  L: "@text/l",
  XL: "@text/xl",
} as const;

export const TEXT_FONT_PRESET_BY_TOKEN = {
  "@text/s": "S",
  "@text/m": "M",
  "@text/l": "L",
  "@text/xl": "XL",
} as const;
