import type { Group } from "konva/lib/Group";
import type { Node } from "konva/lib/Node";
import type { Shape, ShapeConfig } from "konva/lib/Shape";
import type { RenderService } from "../../new-services/render/RenderService";

export type TArgsGetSelectionPath = {
  render: RenderService;
  node: Group | Shape<ShapeConfig>;
};

export function fxGetSelectionPath(args: TArgsGetSelectionPath) {
  const path: Array<Group | Shape<ShapeConfig>> = [];
  let current: Node | null = args.node;

  while (current && current !== args.render.staticForegroundLayer) {
    if (current instanceof args.render.Group || current instanceof args.render.Shape) {
      path.push(current);
    }

    current = current.getParent();
  }

  return path.reverse();
}
