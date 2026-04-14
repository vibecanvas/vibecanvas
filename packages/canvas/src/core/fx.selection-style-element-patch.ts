import type { TArrowData, TElement, TElementStyle, TLineData, TTextData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { fnGetScaledFontSizeFromPreset, type TFontSizePreset } from "./fn.text-style";
import type { TSelectionStyleProperty } from "./fn.selection-style-menu";
import type { TCapStyle, TLineType } from "../components/SelectionStyleMenu/types";

export type TPortalSelectionStyleElementPatch = {
  now: () => number;
};

export type TArgsCloneElementWithSelectionStyle = {
  element: TElement;
  style: Partial<TElementStyle>;
};

export function fxCloneElementWithSelectionStyle(
  portal: TPortalSelectionStyleElementPatch,
  args: TArgsCloneElementWithSelectionStyle,
): TElement {
  return {
    ...structuredClone(args.element),
    updatedAt: portal.now(),
    style: {
      ...structuredClone(args.element.style),
      ...args.style,
    },
  };
}

export type TArgsCreateSelectionStyleDataPatch = {
  element: TElement;
  property: Extract<TSelectionStyleProperty, "fontFamily" | "fontSizePreset" | "textAlign" | "verticalAlign" | "lineType" | "startCap" | "endCap">;
  value: string;
};

export function fxCreateSelectionStyleDataPatch(
  portal: TPortalSelectionStyleElementPatch,
  args: TArgsCreateSelectionStyleDataPatch,
): TElement | null {
  if (args.property === "fontFamily" && args.element.data.type === "text") {
    return {
      ...structuredClone(args.element),
      updatedAt: portal.now(),
      data: {
        ...args.element.data,
        fontFamily: args.value,
      },
    };
  }

  if (args.property === "fontSizePreset" && args.element.data.type === "text") {
    const textData = structuredClone(args.element.data) as TTextData;
    return {
      ...structuredClone(args.element),
      updatedAt: portal.now(),
      data: {
        ...textData,
        fontSize: fnGetScaledFontSizeFromPreset({
          currentFontSize: textData.fontSize,
          currentPreset: textData.fontSizePreset,
          nextPreset: args.value as TFontSizePreset,
        }),
        fontSizePreset: args.value as TFontSizePreset,
      },
    };
  }

  if (args.property === "textAlign" && args.element.data.type === "text") {
    return {
      ...structuredClone(args.element),
      updatedAt: portal.now(),
      data: {
        ...args.element.data,
        textAlign: args.value as TTextData["textAlign"],
      },
    };
  }

  if (args.property === "verticalAlign" && args.element.data.type === "text") {
    return {
      ...structuredClone(args.element),
      updatedAt: portal.now(),
      data: {
        ...args.element.data,
        verticalAlign: args.value as TTextData["verticalAlign"],
      },
    };
  }

  if (args.property === "lineType" && (args.element.data.type === "line" || args.element.data.type === "arrow")) {
    return {
      ...structuredClone(args.element),
      updatedAt: portal.now(),
      data: {
        ...structuredClone(args.element.data),
        lineType: args.value as TLineType,
      } as TLineData | TArrowData,
    };
  }

  if (args.property === "startCap" && args.element.data.type === "arrow") {
    return {
      ...structuredClone(args.element),
      updatedAt: portal.now(),
      data: {
        ...structuredClone(args.element.data),
        startCap: args.value as TCapStyle,
      },
    };
  }

  if (args.property === "endCap" && args.element.data.type === "arrow") {
    return {
      ...structuredClone(args.element),
      updatedAt: portal.now(),
      data: {
        ...structuredClone(args.element.data),
        endCap: args.value as TCapStyle,
      },
    };
  }

  return null;
}
