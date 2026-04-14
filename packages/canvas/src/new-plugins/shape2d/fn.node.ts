import type Konva from "konva";
import type { SceneService } from "../../new-services/scene/SceneService";
import type { TShape2dElementType } from "../../core/fn.shape2d";

export type TShape2dNode = Konva.Rect | Konva.Line | Konva.Ellipse;

export function fxGetShape2dNodeType(args: {
  render: SceneService;
  node: Konva.Node;
}): TShape2dElementType | null {
  const type = args.node.getAttr("vcShape2dType");

  if (type === "rect" && args.node instanceof args.render.Rect) {
    return "rect";
  }

  if (type === "diamond" && args.node instanceof args.render.Line) {
    return "diamond";
  }

  if (type === "ellipse" && args.node instanceof args.render.Ellipse) {
    return "ellipse";
  }

  return null;
}
