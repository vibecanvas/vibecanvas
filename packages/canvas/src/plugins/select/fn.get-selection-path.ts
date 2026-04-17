import type { Group } from "konva/lib/Group";
import type { Node } from "konva/lib/Node";
import type { Shape, ShapeConfig } from "konva/lib/Shape";
import type { TCanvasSemanticsEditor } from "../../core/fx.canvas-node-semantics";
import type { SceneService } from "../../services/scene/SceneService";
import { fnIsCanvasNode } from "../../core/fx.canvas-node-semantics";

export type TArgsGetSelectionPath = {
  render: SceneService;
  editor: TCanvasSemanticsEditor;
  node: Group | Shape<ShapeConfig>;
};

export function fnGetSelectionPath(args: TArgsGetSelectionPath) {
  const path: Array<Group | Shape<ShapeConfig>> = [];
  let current: Node | null = args.node;

  while (current && current !== args.render.staticForegroundLayer) {
    if (fnIsCanvasNode({}, { editor: args.editor, node: current })) {
      path.push(current as Group | Shape<ShapeConfig>);
    }

    current = current.getParent();
  }

  return path.reverse();
}
