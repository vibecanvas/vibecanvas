import type Konva from "konva";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import { fxFilterSelection } from "../../core/fn.filter-selection";
import { fxIsSceneNode } from "./fn.scene-node";

export type TPortalSyncDraggability = {
  editor: EditorService;
  render: RenderService;
  selection: SelectionService;
};

export type TArgsSyncDraggability = Record<string, never>;

export function txSyncDraggability(
  portal: TPortalSyncDraggability,
  args: TArgsSyncDraggability,
) {
  const allSceneNodes = portal.render.staticForegroundLayer.find((node: Konva.Node) => {
    return fxIsSceneNode({ render: portal.render, node });
  });

  allSceneNodes.forEach((node) => {
    if (node.getParent() instanceof portal.render.Group) {
      node.draggable(false);
    }
  });

  portal.render.staticForegroundLayer.getChildren().forEach((node) => {
    if (node instanceof portal.render.Group || node instanceof portal.render.Shape) {
      node.draggable(true);
    }
  });

  const activeNodes = fxFilterSelection({
    render: portal.render,
    editor: portal.editor,
    selection: portal.selection.selection,
  });

  activeNodes.forEach((node) => {
    node.draggable(true);
  });

  void args;
}
