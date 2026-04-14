import type Konva from "konva";
import type { EditorService } from "../../services/editor/EditorService";
import type { SceneService } from "../../services/scene/SceneService";
import type { SelectionService } from "../../services/selection/SelectionService";
import { fxFilterSelection } from "../../core/fx.filter-selection";
import { fxIsSceneNode } from "./fn.scene-node";

export type TPortalSyncDraggability = {
  Konva: typeof Konva;
  editor: EditorService;
  render: SceneService;
  selection: SelectionService;
};

export type TArgsSyncDraggability = Record<string, never>;

export function txSyncDraggability(
  portal: TPortalSyncDraggability,
  args: TArgsSyncDraggability,
) {
  const allSceneNodes = portal.render.staticForegroundLayer.find((node: Konva.Node) => {
    return fxIsSceneNode({ Group: portal.Konva.Group, Shape: portal.Konva.Shape, render: portal.render, node });
  });

  allSceneNodes.forEach((node) => {
    if (node.getParent() instanceof portal.Konva.Group) {
      node.draggable(false);
    }
  });

  portal.render.staticForegroundLayer.getChildren().forEach((node) => {
    if (node instanceof portal.Konva.Group || node instanceof portal.Konva.Shape) {
      node.draggable(true);
    }
  });

  const activeNodes = fxFilterSelection({
    Konva: portal.Konva,
  }, {
    editor: portal.editor,
    selection: portal.selection.selection,
  });

  activeNodes.forEach((node) => {
    node.draggable(true);
  });

  void args;
}
