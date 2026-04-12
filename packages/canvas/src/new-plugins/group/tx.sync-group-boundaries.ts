import type Konva from "konva";
import type { RenderService } from "../../new-services/render/RenderService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import { fxCreateGroupBoundary } from "./fx.create-group-boundary";

export type TGroupBoundary = ReturnType<typeof fxCreateGroupBoundary>;

export type TPortalSyncGroupBoundaries = {
  render: RenderService;
  selection: SelectionService;
  boundaries: Map<string, TGroupBoundary>;
};

export type TArgsSyncGroupBoundaries = Record<string, never>;

export function txSyncGroupBoundaries(
  portal: TPortalSyncGroupBoundaries,
  args: TArgsSyncGroupBoundaries,
) {
  const markedToRemove = new Set(portal.boundaries.keys());

  portal.selection.selection
    .filter((node): node is Konva.Group => node instanceof portal.render.Group)
    .forEach((group) => {
      const boundary = portal.boundaries.get(group.id()) ?? fxCreateGroupBoundary({ render: portal.render }, { group });
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
