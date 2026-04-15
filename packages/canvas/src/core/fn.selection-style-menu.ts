import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type { TSelectionStyleMenuSections, TSelectionStyleMenuValues } from "../components/SelectionStyleMenu";
import type { TCapStyle, TFontFamily, TLineType, TStrokeWidthOption } from "../components/SelectionStyleMenu/types";
import type { TCanvasRegistrySelectionStyleConfig } from "../services/canvas-registry/CanvasRegistryService";
import { fnGetNearestFontSizePreset, type TFontSizePreset } from "./fn.text-style";

const LINE_TYPES = new Set(["line", "arrow"]);

export type TSelectionStyleProperty =
  | "fill"
  | "stroke"
  | "strokeWidth"
  | "opacity"
  | "fontFamily"
  | "fontSizePreset"
  | "textAlign"
  | "verticalAlign"
  | "lineType"
  | "startCap"
  | "endCap";

function getEmptySections(): TSelectionStyleMenuSections {
  return {
    showFillPicker: false,
    showStrokeColorPicker: false,
    showStrokeWidthPicker: false,
    showTextPickers: false,
    showOpacityPicker: false,
    showLineTypePicker: false,
    showStartCapPicker: false,
    showEndCapPicker: false,
  };
}

function getSectionKeyForProperty(property: TSelectionStyleProperty): keyof TSelectionStyleMenuSections {
  switch (property) {
    case "fill":
      return "showFillPicker";
    case "stroke":
      return "showStrokeColorPicker";
    case "strokeWidth":
      return "showStrokeWidthPicker";
    case "opacity":
      return "showOpacityPicker";
    case "fontFamily":
    case "fontSizePreset":
    case "textAlign":
    case "verticalAlign":
      return "showTextPickers";
    case "lineType":
      return "showLineTypePicker";
    case "startCap":
      return "showStartCapPicker";
    case "endCap":
      return "showEndCapPicker";
    default:
      return "showFillPicker";
  }
}

function getMergedSections(configs: TCanvasRegistrySelectionStyleConfig[]) {
  return configs.reduce((sections, config) => {
    const next = config.sections;
    if (!next) {
      return sections;
    }

    return {
      showFillPicker: sections.showFillPicker || next.showFillPicker === true,
      showStrokeColorPicker: sections.showStrokeColorPicker || next.showStrokeColorPicker === true,
      showStrokeWidthPicker: sections.showStrokeWidthPicker || next.showStrokeWidthPicker === true,
      showTextPickers: sections.showTextPickers || next.showTextPickers === true,
      showOpacityPicker: sections.showOpacityPicker || next.showOpacityPicker === true,
      showLineTypePicker: sections.showLineTypePicker || next.showLineTypePicker === true,
      showStartCapPicker: sections.showStartCapPicker || next.showStartCapPicker === true,
      showEndCapPicker: sections.showEndCapPicker || next.showEndCapPicker === true,
    } satisfies TSelectionStyleMenuSections;
  }, getEmptySections());
}

function getMergedValues(configs: TCanvasRegistrySelectionStyleConfig[]) {
  return configs.reduce((values, config) => {
    if (!config.values) {
      return values;
    }

    return {
      ...values,
      ...config.values,
    };
  }, {} as TSelectionStyleMenuValues);
}

export function fxHasSelectionStylePropertySupport(args: {
  config: TCanvasRegistrySelectionStyleConfig | null | undefined;
  property: TSelectionStyleProperty;
}) {
  const sectionKey = getSectionKeyForProperty(args.property);
  return args.config?.sections?.[sectionKey] === true;
}

export function fxGetSelectionStyleStrokeColorKey(element: TElement): "strokeColor" | "backgroundColor" {
  if ((element.data.type === "pen" || LINE_TYPES.has(element.data.type))
    && typeof element.style.strokeColor !== "string"
    && typeof element.style.backgroundColor === "string") {
    return "backgroundColor";
  }

  return "strokeColor";
}

export function fxGetSelectionStyleMenuSections(args: {
  configs: TCanvasRegistrySelectionStyleConfig[];
}): TSelectionStyleMenuSections {
  return getMergedSections(args.configs);
}

export function fxGetSelectionStyleStrokeWidthOptions(args: {
  configs: TCanvasRegistrySelectionStyleConfig[];
}): TStrokeWidthOption[] | undefined {
  const options = args.configs.flatMap((config) => config.strokeWidthOptions ?? []);
  if (options.length === 0) {
    return undefined;
  }

  const deduped = new Map<number, TStrokeWidthOption>();
  options.forEach((option) => {
    if (!deduped.has(option.value)) {
      deduped.set(option.value, option);
    }
  });

  return [...deduped.values()];
}

export function fxGetSelectionStyleMenuValues(args: {
  elements: TElement[];
  textElements: TElement[];
  configs: TCanvasRegistrySelectionStyleConfig[];
}): TSelectionStyleMenuValues {
  const sections = getMergedSections(args.configs);
  const defaults = getMergedValues(args.configs);
  const fill = args.elements.find((element) => typeof element.style.backgroundColor === "string");
  const stroke = args.elements.find((element) => {
    return typeof element.style.strokeColor === "string" || typeof element.style.backgroundColor === "string";
  });
  const width = args.elements.find((element) => typeof element.style.strokeWidth === "number");
  const opacity = args.elements.find((element) => typeof element.style.opacity === "number");
  const text = args.textElements[0];
  const line = args.elements.find((element) => {
    return element.data.type === "line" || element.data.type === "arrow";
  });
  const arrow = args.elements.find((element) => element.data.type === "arrow");

  return {
    fillColor: sections.showFillPicker ? (fill?.style.backgroundColor ?? defaults.fillColor) : undefined,
    strokeColor: sections.showStrokeColorPicker ? (stroke?.style.strokeColor ?? stroke?.style.backgroundColor ?? defaults.strokeColor) : undefined,
    strokeWidth: sections.showStrokeWidthPicker ? (width?.style.strokeWidth ?? defaults.strokeWidth) : undefined,
    opacity: sections.showOpacityPicker ? (opacity?.style.opacity ?? defaults.opacity) : undefined,
    fontFamily: sections.showTextPickers
      ? (text?.data.type === "text" ? text.data.fontFamily as TFontFamily : defaults.fontFamily)
      : undefined,
    fontSizePreset: sections.showTextPickers
      ? (text?.data.type === "text"
        ? (text.data.fontSizePreset ?? fnGetNearestFontSizePreset(text.data.fontSize)) as TFontSizePreset
        : defaults.fontSizePreset)
      : undefined,
    textAlign: sections.showTextPickers
      ? (text?.data.type === "text" ? text.data.textAlign : defaults.textAlign)
      : undefined,
    verticalAlign: sections.showTextPickers
      ? (text?.data.type === "text" ? text.data.verticalAlign : defaults.verticalAlign)
      : undefined,
    lineType: sections.showLineTypePicker
      ? (line?.data.type === "line" || line?.data.type === "arrow" ? line.data.lineType as TLineType : defaults.lineType)
      : undefined,
    startCap: sections.showStartCapPicker
      ? (arrow?.data.type === "arrow" ? arrow.data.startCap as TCapStyle : defaults.startCap)
      : undefined,
    endCap: sections.showEndCapPicker
      ? (arrow?.data.type === "arrow" ? arrow.data.endCap as TCapStyle : defaults.endCap)
      : undefined,
  };
}

export function fxGetSelectionStyleMenuValuesWithOverrides(args: {
  values: TSelectionStyleMenuValues;
  overrides: Partial<TSelectionStyleMenuValues>;
}): TSelectionStyleMenuValues {
  return {
    ...args.values,
    ...Object.fromEntries(Object.entries(args.overrides).filter(([, value]) => value !== undefined)),
  };
}
