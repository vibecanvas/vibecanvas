import type { TTextData } from "@vibecanvas/service-automerge/types/canvas-doc.types";

export type TFontSizePreset = "S" | "M" | "L" | "XL";
export type TTextAlign = TTextData["textAlign"];
export type TVerticalAlign = TTextData["verticalAlign"];

export function fxGetFontSizePresetOptions() {
  return [
    { label: "S", value: "S" as const, fontSize: 16 },
    { label: "M", value: "M" as const, fontSize: 20 },
    { label: "L", value: "L" as const, fontSize: 28 },
    { label: "XL", value: "XL" as const, fontSize: 36 },
  ];
}

export function fxGetFontSizePresetValue(preset: TFontSizePreset) {
  const match = fxGetFontSizePresetOptions().find((option) => option.value === preset);
  return match?.fontSize ?? 16;
}

export function fxGetNearestFontSizePreset(fontSize: number): TFontSizePreset {
  const [first, ...rest] = fxGetFontSizePresetOptions();
  let nearest = first ?? { value: "S" as const, fontSize: 16 };

  for (const option of rest) {
    if (Math.abs(option.fontSize - fontSize) < Math.abs(nearest.fontSize - fontSize)) {
      nearest = option;
    }
  }

  return nearest.value;
}

export function fxGetScaledFontSizeFromPreset(args: {
  currentFontSize: number;
  currentPreset: TFontSizePreset | undefined;
  nextPreset: TFontSizePreset;
}) {
  const resolvedCurrentPreset = args.currentPreset ?? fxGetNearestFontSizePreset(args.currentFontSize);
  const currentBaseline = fxGetFontSizePresetValue(resolvedCurrentPreset);
  const nextBaseline = fxGetFontSizePresetValue(args.nextPreset);
  const scale = currentBaseline <= 0 ? 1 : args.currentFontSize / currentBaseline;

  return Math.max(1, Math.round(nextBaseline * scale));
}

export function fxGetHorizontalTextAlignOptions() {
  return [
    { label: "L", value: "left" as const },
    { label: "C", value: "center" as const },
    { label: "R", value: "right" as const },
  ];
}

export function fxGetVerticalTextAlignOptions() {
  return [
    { label: "T", value: "top" as const },
    { label: "M", value: "middle" as const },
    { label: "B", value: "bottom" as const },
  ];
}
