import type Konva from "konva";
import type { RenderService } from "../../new-services/render/RenderService";

export type TShapeTextHostBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

function getDiamondSize(node: Konva.Line) {
  const points = node.points();
  const xs = points.filter((_, index) => index % 2 === 0);
  const ys = points.filter((_, index) => index % 2 === 1);

  return {
    width: Math.max(...xs, 0) - Math.min(...xs, 0),
    height: Math.max(...ys, 0) - Math.min(...ys, 0),
  };
}

export function fxGetShapeTextHostBounds(args: {
  render: RenderService;
  node: Konva.Shape;
}) {
  if (args.node instanceof args.render.Rect) {
    return {
      x: args.node.x(),
      y: args.node.y(),
      width: args.node.width(),
      height: args.node.height(),
      rotation: args.node.rotation(),
    } satisfies TShapeTextHostBounds;
  }

  if (args.node instanceof args.render.Ellipse) {
    return {
      x: args.node.x() - args.node.radiusX(),
      y: args.node.y() - args.node.radiusY(),
      width: args.node.radiusX() * 2,
      height: args.node.radiusY() * 2,
      rotation: args.node.rotation(),
    } satisfies TShapeTextHostBounds;
  }

  if (args.node instanceof args.render.Line && args.node.getAttr("vcShape2dType") === "diamond") {
    const size = getDiamondSize(args.node);
    return {
      x: args.node.x(),
      y: args.node.y(),
      width: size.width,
      height: size.height,
      rotation: args.node.rotation(),
    } satisfies TShapeTextHostBounds;
  }

  return null;
}
