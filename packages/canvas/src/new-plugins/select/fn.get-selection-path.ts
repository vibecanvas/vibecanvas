import type { Group } from "konva/lib/Group";
import type { Node } from "konva/lib/Node";
import type { Shape, ShapeConfig } from "konva/lib/Shape";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { RenderService } from "../../new-services/render/RenderService";
import { fxIsCanvasNode } from "../../core/fn.canvas-node-semantics";

export type TArgsGetSelectionPath = {
  render: RenderService;
  editor: EditorService;
  node: Group | Shape<ShapeConfig>;
};

export function fxGetSelectionPath(args: TArgsGetSelectionPath) {
  const path: Array<Group | Shape<ShapeConfig>> = [];
  let current: Node | null = args.node;

  while (current && current !== args.render.staticForegroundLayer) {
    if (fxIsCanvasNode({ editor: args.editor, node: current })) {
      path.push(current as Group | Shape<ShapeConfig>);
    }

    current = current.getParent();
  }

  return path.reverse();
}
