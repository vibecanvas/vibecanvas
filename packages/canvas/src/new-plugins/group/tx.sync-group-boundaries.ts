import type { ThemeService } from "@vibecanvas/service-theme";
import type Konva from "konva";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { SceneService } from "../../new-services/scene/SceneService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import { fxIsCanvasGroupNode } from "../../core/fx.canvas-node-semantics";
import { fxCreateGroupBoundary } from "./fx.create-group-boundary";

export type TGroupBoundary = ReturnType<typeof fxCreateGroupBoundary>;

export type TPortalSyncGroupBoundaries = {
  editor: EditorService;
  render: SceneService;
  selection: SelectionService;
  theme: ThemeService;
  boundaries: Map<string, TGroupBoundary>;
};

export type TArgsSyncGroupBoundaries = Record<string, never>;

export function txSyncGroupBoundaries(
  portal: TPortalSyncGroupBoundaries,
  args: TArgsSyncGroupBoundaries,
) {
  const markedToRemove = new Set(portal.boundaries.keys());

  portal.selection.selection
    .filter((node): node is Konva.Group => fxIsCanvasGroupNode({}, { editor: portal.editor, node }))
    .forEach((group) => {
      const boundary = portal.boundaries.get(group.id()) ?? fxCreateGroupBoundary({ render: portal.render, theme: portal.theme }, { group });
      boundary.syncTheme();
      portal.boundaries.set(group.id(), boundary);
      portal.render.dynamicLayer.add(boundary.node);
      boundary.show();
      markedToRemove.delete(group.id());
    });

  markedToRemove.forEach((id) => {
    const boundary = portal.boundaries.get(id);
    if (!boundary) {
      return;
    }

    boundary.hide();
    boundary.node.destroy();
    portal.boundaries.delete(id);
  });

  void args;
}
