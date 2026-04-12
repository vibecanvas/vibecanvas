import type Konva from "konva";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { fxGetDiamondPoints } from "../../core/fn.shape2d";
import { fxGetAbsolutePositionFromWorldPosition } from "../../core/fn.world-position";
import type { RenderService } from "../../new-services/render/RenderService";

export type TPortalUpdateShape2dNodeFromElement = {
  render: RenderService;
  setNodeZIndex: (node: Konva.Shape, zIndex: string) => void;
};

export type TArgsUpdateShape2dNodeFromElement = {
  node: Konva.Node;
  element: TElement;
};

function syncShapeFill(node: Konva.Shape, backgroundColor: string | undefined) {
  if (typeof backgroundColor === "string") {
    node.fillEnabled(true);
    node.fill(backgroundColor);
    return;
  }

  node.fillEnabled(false);
  node.fill(undefined);
}

function syncShapeStroke(node: Konva.Shape, strokeColor: string | undefined, strokeWidth: number | undefined) {
  if (typeof strokeColor === "string") {
    node.strokeEnabled(true);
    node.stroke(strokeColor);
    node.strokeWidth(strokeWidth ?? 0);
    return;
  }

  node.strokeEnabled(false);
  node.stroke(undefined);
  node.strokeWidth(strokeWidth ?? 0);
}

export function txUpdateShape2dNodeFromElement(
  portal: TPortalUpdateShape2dNodeFromElement,
  args: TArgsUpdateShape2dNodeFromElement,
) {
  const style = args.element.style;
  const node = args.node;

  if (args.element.data.type === "rect" && node instanceof portal.render.Rect) {
    const absolutePosition = fxGetAbsolutePositionFromWorldPosition({
      worldPosition: { x: args.element.x, y: args.element.y },
      parentTransform: node.getLayer()?.getAbsoluteTransform() ?? null,
    });

    node.absolutePosition(absolutePosition);
    node.rotation(args.element.rotation);
    node.width(args.element.data.w);
    node.height(args.element.data.h);
    node.scale({ x: 1, y: 1 });
    node.opacity(style.opacity ?? 1);
    node.draggable(true);
    node.listening(true);
    node.setAttr("vcShape2dType", "rect");
    node.setAttr("vcElementCreatedAt", args.element.createdAt);
    syncShapeFill(node, style.backgroundColor);
    syncShapeStroke(node, style.strokeColor, style.strokeWidth);
    portal.setNodeZIndex(node, args.element.zIndex);
    return true;
  }

  if (args.element.data.type === "diamond" && node instanceof portal.render.Line) {
    const absolutePosition = fxGetAbsolutePositionFromWorldPosition({
      worldPosition: { x: args.element.x, y: args.element.y },
      parentTransform: node.getLayer()?.getAbsoluteTransform() ?? null,
    });

    node.absolutePosition(absolutePosition);
    node.rotation(args.element.rotation);
    node.points(fxGetDiamondPoints({
      width: args.element.data.w,
      height: args.element.data.h,
    }));
    node.closed(true);
    node.scale({ x: 1, y: 1 });
    node.opacity(style.opacity ?? 1);
    node.draggable(true);
    node.listening(true);
    node.setAttr("vcShape2dType", "diamond");
    node.setAttr("vcElementCreatedAt", args.element.createdAt);
    syncShapeFill(node, style.backgroundColor);
    syncShapeStroke(node, style.strokeColor, style.strokeWidth);
    portal.setNodeZIndex(node, args.element.zIndex);
    return true;
  }

  if (args.element.data.type === "ellipse" && node instanceof portal.render.Ellipse) {
    const absolutePosition = fxGetAbsolutePositionFromWorldPosition({
      worldPosition: {
        x: args.element.x + args.element.data.rx,
        y: args.element.y + args.element.data.ry,
      },
      parentTransform: node.getLayer()?.getAbsoluteTransform() ?? null,
    });

    node.absolutePosition(absolutePosition);
    node.rotation(args.element.rotation);
    node.radiusX(args.element.data.rx);
    node.radiusY(args.element.data.ry);
    node.scale({ x: 1, y: 1 });
    node.opacity(style.opacity ?? 1);
    node.draggable(true);
    node.listening(true);
    node.setAttr("vcShape2dType", "ellipse");
    node.setAttr("vcElementCreatedAt", args.element.createdAt);
    syncShapeFill(node, style.backgroundColor);
    syncShapeStroke(node, style.strokeColor, style.strokeWidth);
    portal.setNodeZIndex(node, args.element.zIndex);
    return true;
  }

  return false;
}
