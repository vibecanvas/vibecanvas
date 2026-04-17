import type Konva from "konva";
import type { CanvasRegistryService } from "../../services/canvas-registry/CanvasRegistryService";
import type { SceneService } from "../../services/scene/SceneService";
import type { SelectionService } from "../../services/selection/SelectionService";
import { isKonvaGroup, isKonvaShape } from "../../core/GUARDS";
import { fxFilterSelection } from "../../core/fx.filter-selection";
import { fxIsSceneNode } from "./fn.scene-node";

export type TPortalSyncDraggability = {
  Konva: typeof Konva;
  canvasRegistry: CanvasRegistryService;
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
    if (isKonvaGroup(node.getParent())) {
      node.draggable(false);
    }
  });

  portal.render.staticForegroundLayer.getChildren().forEach((node) => {
    if (isKonvaGroup(node) || isKonvaShape(node)) {
      node.draggable(true);
    }
  });

  const activeNodes = fxFilterSelection({
    Konva: portal.Konva,
  }, {
    editor: portal.canvasRegistry,
    selection: portal.selection.selection,
  });

  activeNodes.forEach((node) => {
    node.draggable(true);
  });

  void args;
}
