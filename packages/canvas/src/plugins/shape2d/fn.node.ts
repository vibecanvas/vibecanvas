import type Konva from "konva";
import type { TShape2dElementType } from "../../core/fn.shape2d";

export type TShape2dNode = Konva.Rect | Konva.Line | Konva.Ellipse;

export function fnGetShape2dNodeType(args: {
  Rect: typeof Konva.Rect;
  Line: typeof Konva.Line;
  Ellipse: typeof Konva.Ellipse;
  node: Konva.Node;
}): TShape2dElementType | null {
  const type = args.node.getAttr("vcShape2dType");

  if (type === "rect" && args.node instanceof args.Rect) {
    return "rect";
  }

  if (type === "diamond" && args.node instanceof args.Line) {
    return "diamond";
  }

  if (type === "ellipse" && args.node instanceof args.Ellipse) {
    return "ellipse";
  }

  return null;
}
