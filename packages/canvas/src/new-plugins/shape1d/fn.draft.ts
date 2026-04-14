import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import {
  DEFAULT_OPACITY,
  DEFAULT_STROKE,
  DEFAULT_STROKE_WIDTH,
  type TPoint,
  type TShape1dData,
  type TShape1dTool,
} from "./CONSTANTS";

export function fxCreateFallbackPreviewElement(args: {
  activeTool: TShape1dTool;
  draftElementId: string | null;
  createId: () => string;
  now: () => number;
}) {
  const timestamp = args.now();

  return {
    id: args.draftElementId ?? args.createId(),
    x: 0,
    y: 0,
    rotation: 0,
    bindings: [],
    createdAt: timestamp,
    locked: false,
    parentGroupId: null,
    updatedAt: timestamp,
    zIndex: "",
    data: {
      type: args.activeTool === "arrow" ? "arrow" : "line",
      lineType: "straight",
      points: [[0, 0], [0, 0]],
      startBinding: null,
      endBinding: null,
      ...(args.activeTool === "arrow" ? { startCap: "none", endCap: "arrow" } : {}),
    } as TShape1dData,
    style: {
      strokeColor: DEFAULT_STROKE,
      opacity: DEFAULT_OPACITY,
      strokeWidth: DEFAULT_STROKE_WIDTH,
    },
  } satisfies TElement;
}

export function fxCreateDraftElement(args: {
  activeTool: TShape1dTool;
  draftElementId: string | null;
  draftStartPoint: TPoint | null;
  draftCurrentPoint: TPoint | null;
  createId: () => string;
  now: () => number;
}) {
  if (!args.draftStartPoint || !args.draftCurrentPoint) {
    return null;
  }

  const [startX, startY] = args.draftStartPoint;
  const [endX, endY] = args.draftCurrentPoint;
  const dx = endX - startX;
  const dy = endY - startY;
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
    return null;
  }

  const timestamp = args.now();
  return {
    id: args.draftElementId ?? args.createId(),
    x: startX,
    y: startY,
    rotation: 0,
    bindings: [],
    createdAt: timestamp,
    locked: false,
    parentGroupId: null,
    updatedAt: timestamp,
    zIndex: "",
    data: args.activeTool === "arrow"
      ? {
          type: "arrow",
          lineType: "straight",
          points: [[0, 0], [dx, dy]],
          startBinding: null,
          endBinding: null,
          startCap: "none",
          endCap: "arrow",
        }
      : {
          type: "line",
          lineType: "straight",
          points: [[0, 0], [dx, dy]],
          startBinding: null,
          endBinding: null,
        },
    style: {
      strokeColor: DEFAULT_STROKE,
      opacity: DEFAULT_OPACITY,
      strokeWidth: DEFAULT_STROKE_WIDTH,
    },
  } satisfies TElement;
}
