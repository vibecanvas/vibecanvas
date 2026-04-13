import type { TCustomData, TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";

export type TArgsCreateHostedComponentElement = {
  id: string;
  x: number;
  y: number;
  createdAt: number;
  updatedAt: number;
  kind: string;
  width: number;
  height: number;
  backgroundColor: string;
};

export function fxCreateHostedComponentElement(args: TArgsCreateHostedComponentElement) {
  const data: TCustomData = {
    type: "custom",
    w: args.width,
    h: args.height,
    expanded: true,
    payload: {
      kind: args.kind,
      backgroundColor: args.backgroundColor,
    },
  };

  return {
    id: args.id,
    x: args.x,
    y: args.y,
    rotation: 0,
    bindings: [],
    createdAt: args.createdAt,
    updatedAt: args.updatedAt,
    locked: false,
    parentGroupId: null,
    zIndex: "",
    style: {
      backgroundColor: args.backgroundColor,
      opacity: 1,
      strokeWidth: 0,
    },
    data,
  } satisfies TElement;
}
