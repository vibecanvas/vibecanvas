import type { TArrowData, TElement, TElementStyle, TLineData, TTextData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type { TSelectionStyleMenuSections, TSelectionStyleMenuValues } from "../components/SelectionStyleMenu";
import type { TCapStyle, TFontFamily, TLineType, TStrokeWidthOption } from "../components/SelectionStyleMenu/types";
import { fxGetNearestFontSizePreset, fxGetScaledFontSizeFromPreset, type TFontSizePreset } from "./fn.text-style";

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

export function fxHasSelectionStylePropertySupport(element: TElement, property: TSelectionStyleProperty) {
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

export function fxCloneElementWithSelectionStyle(element: TElement, style: Partial<TElementStyle>): TElement {
  return {
    ...structuredClone(element),
    updatedAt: Date.now(),
    style: {
      ...structuredClone(element.style),
      ...style,
    },
  };
}

export function fxGetSelectionStyleStrokeColorKey(element: TElement): "strokeColor" | "backgroundColor" {
  if ((element.data.type === "pen" || LINE_TYPES.has(element.data.type))
    && typeof element.style.strokeColor !== "string"
    && typeof element.style.backgroundColor === "string") {
    return "backgroundColor";
  }

  return "strokeColor";
}

export function fxIsUnsupportedSelectionStyleElement(element: TElement) {
  return UNSUPPORTED_TYPES.has(element.data.type);
}

export function fxGetSelectionStyleMenuSections(args: {
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
    showFillPicker: args.elements.some((element) => fxHasSelectionStylePropertySupport(element, "fill")),
    showStrokeColorPicker: args.elements.some((element) => fxHasSelectionStylePropertySupport(element, "stroke")),
    showStrokeWidthPicker: args.elements.some((element) => fxHasSelectionStylePropertySupport(element, "strokeWidth")),
    showTextPickers: args.textElements.length > 0,
    showOpacityPicker: args.elements.some((element) => fxHasSelectionStylePropertySupport(element, "opacity")),
    showLineTypePicker: args.elements.some((element) => fxHasSelectionStylePropertySupport(element, "lineType")),
    showStartCapPicker: args.elements.some((element) => fxHasSelectionStylePropertySupport(element, "startCap")),
    showEndCapPicker: args.elements.some((element) => fxHasSelectionStylePropertySupport(element, "endCap")),
  };
}

export function fxGetSelectionStyleStrokeWidthOptions(elements: TElement[]): TStrokeWidthOption[] {
  const widthElements = elements.filter((element) => fxHasSelectionStylePropertySupport(element, "strokeWidth"));
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

export function fxGetSelectionStyleMenuValues(args: {
  elements: TElement[];
  textElements: TElement[];
}): TSelectionStyleMenuValues {
  const fill = args.elements.find((element) => fxHasSelectionStylePropertySupport(element, "fill"));
  const stroke = args.elements.find((element) => fxHasSelectionStylePropertySupport(element, "stroke"));
  const width = args.elements.find((element) => fxHasSelectionStylePropertySupport(element, "strokeWidth"));
  const opacity = args.elements.find((element) => fxHasSelectionStylePropertySupport(element, "opacity"));
  const text = args.textElements[0];
  const line = args.elements.find((element) => fxHasSelectionStylePropertySupport(element, "lineType"));
  const arrow = args.elements.find((element) => element.data.type === "arrow");

  return {
    fillColor: fill?.style.backgroundColor,
    strokeColor: stroke?.style.strokeColor ?? stroke?.style.backgroundColor,
    strokeWidth: width?.style.strokeWidth,
    opacity: opacity?.style.opacity,
    fontFamily: text?.data.type === "text" ? text.data.fontFamily as TFontFamily : undefined,
    fontSizePreset: text?.data.type === "text"
      ? (text.data.fontSizePreset ?? fxGetNearestFontSizePreset(text.data.fontSize)) as TFontSizePreset
      : undefined,
    textAlign: text?.data.type === "text" ? text.data.textAlign : undefined,
    verticalAlign: text?.data.type === "text" ? text.data.verticalAlign : undefined,
    lineType: line?.data.type === "line" || line?.data.type === "arrow" ? line.data.lineType as TLineType : undefined,
    startCap: arrow?.data.type === "arrow" ? arrow.data.startCap as TCapStyle : undefined,
    endCap: arrow?.data.type === "arrow" ? arrow.data.endCap as TCapStyle : undefined,
  };
}

export function fxCreateSelectionStyleDataPatch(
  element: TElement,
  property: Extract<TSelectionStyleProperty, "fontFamily" | "fontSizePreset" | "textAlign" | "verticalAlign" | "lineType" | "startCap" | "endCap">,
  value: string,
): TElement | null {
  if (property === "fontFamily" && element.data.type === "text") {
    return {
      ...structuredClone(element),
      updatedAt: Date.now(),
      data: {
        ...element.data,
        fontFamily: value,
      },
    };
  }

  if (property === "fontSizePreset" && element.data.type === "text") {
    const textData = structuredClone(element.data) as TTextData;
    return {
      ...structuredClone(element),
      updatedAt: Date.now(),
      data: {
        ...textData,
        fontSize: fxGetScaledFontSizeFromPreset({
          currentFontSize: textData.fontSize,
          currentPreset: textData.fontSizePreset,
          nextPreset: value as TFontSizePreset,
        }),
        fontSizePreset: value as TFontSizePreset,
      },
    };
  }

  if (property === "textAlign" && element.data.type === "text") {
    return {
      ...structuredClone(element),
      updatedAt: Date.now(),
      data: {
        ...element.data,
        textAlign: value as TTextData["textAlign"],
      },
    };
  }

  if (property === "verticalAlign" && element.data.type === "text") {
    return {
      ...structuredClone(element),
      updatedAt: Date.now(),
      data: {
        ...element.data,
        verticalAlign: value as TTextData["verticalAlign"],
      },
    };
  }

  if (property === "lineType" && (element.data.type === "line" || element.data.type === "arrow")) {
    return {
      ...structuredClone(element),
      updatedAt: Date.now(),
      data: {
        ...structuredClone(element.data),
        lineType: value as TLineType,
      } as TLineData | TArrowData,
    };
  }

  if (property === "startCap" && element.data.type === "arrow") {
    return {
      ...structuredClone(element),
      updatedAt: Date.now(),
      data: {
        ...structuredClone(element.data),
        startCap: value as TCapStyle,
      },
    };
  }

  if (property === "endCap" && element.data.type === "arrow") {
    return {
      ...structuredClone(element),
      updatedAt: Date.now(),
      data: {
        ...structuredClone(element.data),
        endCap: value as TCapStyle,
      },
    };
  }

  return null;
}
