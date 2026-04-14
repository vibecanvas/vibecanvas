import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { fnGetNearestFontSizePreset } from "../../core/fn.text-style";

export type TArgsCreateTextElement = {
  id: string;
  x: number;
  y: number;
  createdAt: number;
  updatedAt: number;
};

export function fxCreateTextElement(args: TArgsCreateTextElement) {
  return {
    id: args.id,
    x: args.x,
    y: args.y,
    rotation: 0,
    bindings: [],
    locked: false,
    parentGroupId: null,
    zIndex: "",
    createdAt: args.createdAt,
    updatedAt: args.updatedAt,
    style: {},
    data: {
      type: "text",
      w: 200,
      h: 24,
      text: "",
      originalText: "",
      fontSize: 16,
      fontSizePreset: fnGetNearestFontSizePreset(16),
      fontFamily: "Arial",
      textAlign: "left",
      verticalAlign: "top",
      lineHeight: 1.2,
      link: null,
      containerId: null,
      autoResize: true,
    },
  } satisfies TElement;
}
