import type Konva from "konva";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { fxGetDiamondPoints } from "../../core/fn.shape2d";
import type { RenderService } from "../../new-services/render/RenderService";

export type TPortalCreateShape2dNode = {
  render: RenderService;
  setNodeZIndex: (node: Konva.Shape, zIndex: string) => void;
};

export type TArgsCreateShape2dNode = {
  element: TElement;
};

export function fxCreateShape2dNode(portal: TPortalCreateShape2dNode, args: TArgsCreateShape2dNode) {
  const style = args.element.style;

  if (args.element.data.type === "rect") {
    const node = new portal.render.Rect({
      id: args.element.id,
      x: args.element.x,
      y: args.element.y,
      rotation: args.element.rotation,
      width: args.element.data.w,
      height: args.element.data.h,
      fill: style.backgroundColor,
      stroke: style.strokeColor,
      strokeWidth: style.strokeWidth ?? 0,
      opacity: style.opacity ?? 1,
      draggable: true,
      listening: true,
    });

    node.setAttr("vcShape2dType", "rect");
    node.setAttr("vcElementCreatedAt", args.element.createdAt);
    portal.setNodeZIndex(node, args.element.zIndex);
    return node;
  }

  if (args.element.data.type === "diamond") {
    const node = new portal.render.Line({
      id: args.element.id,
      x: args.element.x,
      y: args.element.y,
      rotation: args.element.rotation,
      closed: true,
      points: fxGetDiamondPoints({
        width: args.element.data.w,
        height: args.element.data.h,
      }),
      fill: style.backgroundColor,
      stroke: style.strokeColor,
      strokeWidth: style.strokeWidth ?? 0,
      opacity: style.opacity ?? 1,
      draggable: true,
      listening: true,
    });

    node.setAttr("vcShape2dType", "diamond");
    node.setAttr("vcElementCreatedAt", args.element.createdAt);
    portal.setNodeZIndex(node, args.element.zIndex);
    return node;
  }

  if (args.element.data.type === "ellipse") {
    const node = new portal.render.Ellipse({
      id: args.element.id,
      x: args.element.x + args.element.data.rx,
      y: args.element.y + args.element.data.ry,
      rotation: args.element.rotation,
      radiusX: args.element.data.rx,
      radiusY: args.element.data.ry,
      fill: style.backgroundColor,
      stroke: style.strokeColor,
      strokeWidth: style.strokeWidth ?? 0,
      opacity: style.opacity ?? 1,
      draggable: true,
      listening: true,
    });

    node.setAttr("vcShape2dType", "ellipse");
    node.setAttr("vcElementCreatedAt", args.element.createdAt);
    portal.setNodeZIndex(node, args.element.zIndex);
    return node;
  }

  return null;
}
