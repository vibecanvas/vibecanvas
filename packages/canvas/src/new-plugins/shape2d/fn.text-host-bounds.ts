import type Konva from "konva";
import type { SceneService } from "../../new-services/scene/SceneService";

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
  render: SceneService;
  node: Konva.Shape;
}) {
  const scaleX = Math.abs(args.node.scaleX());
  const scaleY = Math.abs(args.node.scaleY());

  if (args.node instanceof args.render.Rect) {
    return {
      x: args.node.x(),
      y: args.node.y(),
      width: args.node.width() * scaleX,
      height: args.node.height() * scaleY,
      rotation: args.node.rotation(),
    } satisfies TShapeTextHostBounds;
  }

  if (args.node instanceof args.render.Ellipse) {
    const width = args.node.radiusX() * 2 * scaleX;
    const height = args.node.radiusY() * 2 * scaleY;
    return {
      x: args.node.x() - width / 2,
      y: args.node.y() - height / 2,
      width,
      height,
      rotation: args.node.rotation(),
    } satisfies TShapeTextHostBounds;
  }

  if (args.node instanceof args.render.Line && args.node.getAttr("vcShape2dType") === "diamond") {
    const size = getDiamondSize(args.node);
    return {
      x: args.node.x(),
      y: args.node.y(),
      width: size.width * scaleX,
      height: size.height * scaleY,
      rotation: args.node.rotation(),
    } satisfies TShapeTextHostBounds;
  }

  return null;
}
