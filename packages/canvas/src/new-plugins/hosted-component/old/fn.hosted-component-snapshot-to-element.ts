import type { TCustomData, TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";

export type TArgsHostedComponentSnapshotToElement = {
  id: string;
  x: number;
  y: number;
  rotation: number;
  createdAt: number;
  updatedAt: number;
  parentGroupId: string | null;
  zIndex: string;
  opacity: number;
  width: number;
  height: number;
  kind: string;
  backgroundColor: string;
};

export function fxHostedComponentSnapshotToElement(args: TArgsHostedComponentSnapshotToElement) {
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
    rotation: args.rotation,
    bindings: [],
    createdAt: args.createdAt,
    updatedAt: args.updatedAt,
    locked: false,
    parentGroupId: args.parentGroupId,
    zIndex: args.zIndex,
    style: {
      backgroundColor: args.backgroundColor,
      opacity: args.opacity,
      strokeWidth: 0,
    },
    data,
  } satisfies TElement;
}
