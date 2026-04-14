import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type { TSelectionStyleMenuSections, TSelectionStyleMenuValues } from "../components/SelectionStyleMenu";
import type { TCapStyle, TFontFamily, TLineType, TStrokeWidthOption } from "../components/SelectionStyleMenu/types";
import { fnGetNearestFontSizePreset, type TFontSizePreset } from "./fn.text-style";

const SHAPE_TYPES = new Set(["rect", "ellipse", "diamond"]);
const PEN_TYPES = new Set(["pen"]);
const TEXT_TYPES = new Set(["text"]);
const LINE_TYPES = new Set(["line", "arrow"]);
const UNSUPPORTED_TYPES = new Set(["filetree", "terminal", "file", "image"]);

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

export function fnHasSelectionStylePropertySupport(element: TElement, property: TSelectionStyleProperty) {
  const type = element.data.type;

  if (property === "fill") return SHAPE_TYPES.has(type);
  if (property === "stroke") return SHAPE_TYPES.has(type) || PEN_TYPES.has(type) || TEXT_TYPES.has(type) || LINE_TYPES.has(type);
  if (property === "strokeWidth") return SHAPE_TYPES.has(type) || PEN_TYPES.has(type) || LINE_TYPES.has(type);
  if (property === "opacity") return !UNSUPPORTED_TYPES.has(type);
  if (property === "fontFamily" || property === "fontSizePreset" || property === "textAlign" || property === "verticalAlign") return TEXT_TYPES.has(type);
  if (property === "lineType") return LINE_TYPES.has(type);
  if (property === "startCap") return type === "arrow";
  if (property === "endCap") return type === "arrow";

  return false;
}

export function fnGetSelectionStyleStrokeColorKey(element: TElement): "strokeColor" | "backgroundColor" {
  if ((element.data.type === "pen" || LINE_TYPES.has(element.data.type))
    && typeof element.style.strokeColor !== "string"
    && typeof element.style.backgroundColor === "string") {
    return "backgroundColor";
  }

  return "strokeColor";
}

export function fnIsUnsupportedSelectionStyleElement(element: TElement) {
  return UNSUPPORTED_TYPES.has(element.data.type);
}

export function fnGetSelectionStyleMenuSections(args: {
  elements: TElement[];
  textElements: TElement[];
}): TSelectionStyleMenuSections {
  if (args.elements.length === 0) {
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

  return {
    showFillPicker: args.elements.some((element) => fnHasSelectionStylePropertySupport(element, "fill")),
    showStrokeColorPicker: args.elements.some((element) => fnHasSelectionStylePropertySupport(element, "stroke")),
    showStrokeWidthPicker: args.elements.some((element) => fnHasSelectionStylePropertySupport(element, "strokeWidth")),
    showTextPickers: args.textElements.length > 0,
    showOpacityPicker: args.elements.some((element) => fnHasSelectionStylePropertySupport(element, "opacity")),
    showLineTypePicker: args.elements.some((element) => fnHasSelectionStylePropertySupport(element, "lineType")),
    showStartCapPicker: args.elements.some((element) => fnHasSelectionStylePropertySupport(element, "startCap")),
    showEndCapPicker: args.elements.some((element) => fnHasSelectionStylePropertySupport(element, "endCap")),
  };
}

export function fnGetSelectionStyleStrokeWidthOptions(elements: TElement[]): TStrokeWidthOption[] {
  const widthElements = elements.filter((element) => fnHasSelectionStylePropertySupport(element, "strokeWidth"));
  if (widthElements.length > 0 && widthElements.every((element) => element.data.type === "pen")) {
    return [
      { name: "Thin", value: 3 },
      { name: "Medium", value: 7 },
      { name: "Thick", value: 12 },
    ];
  }

  return [
    { name: "Thin", value: 1 },
    { name: "Medium", value: 2 },
    { name: "Thick", value: 4 },
  ];
}

export function fnGetSelectionStyleMenuValues(args: {
  elements: TElement[];
  textElements: TElement[];
}): TSelectionStyleMenuValues {
  const fill = args.elements.find((element) => fnHasSelectionStylePropertySupport(element, "fill"));
  const stroke = args.elements.find((element) => fnHasSelectionStylePropertySupport(element, "stroke"));
  const width = args.elements.find((element) => fnHasSelectionStylePropertySupport(element, "strokeWidth"));
  const opacity = args.elements.find((element) => fnHasSelectionStylePropertySupport(element, "opacity"));
  const text = args.textElements[0];
  const line = args.elements.find((element) => fnHasSelectionStylePropertySupport(element, "lineType"));
  const arrow = args.elements.find((element) => element.data.type === "arrow");

  return {
    fillColor: fill?.style.backgroundColor,
    strokeColor: stroke?.style.strokeColor ?? stroke?.style.backgroundColor,
    strokeWidth: width?.style.strokeWidth,
    opacity: opacity?.style.opacity,
    fontFamily: text?.data.type === "text" ? text.data.fontFamily as TFontFamily : undefined,
    fontSizePreset: text?.data.type === "text"
      ? (text.data.fontSizePreset ?? fnGetNearestFontSizePreset(text.data.fontSize)) as TFontSizePreset
      : undefined,
    textAlign: text?.data.type === "text" ? text.data.textAlign : undefined,
    verticalAlign: text?.data.type === "text" ? text.data.verticalAlign : undefined,
    lineType: line?.data.type === "line" || line?.data.type === "arrow" ? line.data.lineType as TLineType : undefined,
    startCap: arrow?.data.type === "arrow" ? arrow.data.startCap as TCapStyle : undefined,
    endCap: arrow?.data.type === "arrow" ? arrow.data.endCap as TCapStyle : undefined,
  };
}
