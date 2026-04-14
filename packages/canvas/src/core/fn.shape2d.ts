import type { TElement, TElementStyle } from "@vibecanvas/service-automerge/types/canvas-doc.types";

export type TShape2dPoint = {
  x: number;
  y: number;
};

export type TShape2dToolId = "rectangle" | "diamond" | "ellipse";
export type TShape2dElementType = "rect" | "diamond" | "ellipse";
export type TShape2dBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const DEFAULT_STYLE: TElementStyle = {
  backgroundColor: "red",
  opacity: 1,
  strokeWidth: 0,
};

export function fnIsShape2dToolId(toolId: string): toolId is TShape2dToolId {
  return toolId === "rectangle" || toolId === "diamond" || toolId === "ellipse";
}

export function fnIsShape2dElementType(elementType: string): elementType is TShape2dElementType {
  return elementType === "rect" || elementType === "diamond" || elementType === "ellipse";
}

export function fnGetShape2dElementTypeFromTool(toolId: TShape2dToolId): TShape2dElementType {
  if (toolId === "rectangle") {
    return "rect";
  }

  if (toolId === "diamond") {
    return "diamond";
  }

  return "ellipse";
}

export function fnGetShape2dDraftBounds(args: {
  origin: TShape2dPoint;
  point: TShape2dPoint;
  preserveRatio: boolean;
}): TShape2dBounds {
  const deltaX = args.point.x - args.origin.x;
  const deltaY = args.point.y - args.origin.y;

  if (!args.preserveRatio) {
    return {
      x: Math.min(args.origin.x, args.point.x),
      y: Math.min(args.origin.y, args.point.y),
      width: Math.abs(deltaX),
      height: Math.abs(deltaY),
    };
  }

  const size = Math.max(Math.abs(deltaX), Math.abs(deltaY));
  return {
    x: args.origin.x + (deltaX < 0 ? -size : 0),
    y: args.origin.y + (deltaY < 0 ? -size : 0),
    width: size,
    height: size,
  };
}

export function fnGetDiamondPoints(args: { width: number; height: number }) {
  return [
    args.width / 2,
    0,
    args.width,
    args.height / 2,
    args.width / 2,
    args.height,
    0,
    args.height / 2,
  ];
}

export function fnCreateShape2dElement(args: {
  id: string;
  type: TShape2dElementType;
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
  createdAt: number;
  updatedAt: number;
  parentGroupId: string | null;
  zIndex: string;
  style?: Partial<TElementStyle>;
}): TElement {
  const style: TElementStyle = {
    ...DEFAULT_STYLE,
    ...(args.style ?? {}),
  };

  return {
    id: args.id,
    x: args.x,
    y: args.y,
    rotation: args.rotation,
    bindings: [],
    createdAt: args.createdAt,
    updatedAt: args.updatedAt,
    locked: false,
    parentGroupId: args.parentGroupId,
    zIndex: args.zIndex,
    style,
    data: args.type === "ellipse"
      ? {
          type: "ellipse",
          rx: args.width / 2,
          ry: args.height / 2,
        }
      : {
          type: args.type,
          w: args.width,
          h: args.height,
        },
  } satisfies TElement;
}
