import type { SceneService } from "../../new-services/scene/SceneService";
import type { SelectionService } from "../../new-services/selection/SelectionService";

export type TPortalHandleStagePointerMove = {
  render: SceneService;
  selection: SelectionService;
  selectionRectangle: InstanceType<SceneService["Rect"]>;
  hasSameSelectionOrder: (
    currentSelection: Array<{ id(): string }>,
    nextSelection: Array<{ id(): string }>,
  ) => boolean;
};

export type TArgsHandleStagePointerMove = {
  pointer: { x: number; y: number } | null;
};

function applySelection(
  portal: TPortalHandleStagePointerMove,
  args: { nextSelection: Parameters<SelectionService["setSelection"]>[0] },
) {
  if (portal.hasSameSelectionOrder(portal.selection.selection, args.nextSelection)) {
    return;
  }

  portal.selection.setSelection(args.nextSelection);
}

export function txHandleStagePointerMove(
  portal: TPortalHandleStagePointerMove,
  args: TArgsHandleStagePointerMove,
) {
  if (!args.pointer) {
    return;
  }

  portal.selectionRectangle.size({
    width: args.pointer.x - portal.selectionRectangle.x(),
    height: args.pointer.y - portal.selectionRectangle.y(),
  });

  const topNodes = portal.render.staticForegroundLayer.getChildren((node) => {
    return node.parent?.id() === portal.render.staticForegroundLayer.id();
  });
  const nextSelection = topNodes
    .filter((node) => {
      if (!(node instanceof portal.render.Group || node instanceof portal.render.Shape)) {
        return false;
      }

      if (node.getAttr("vcInteractionOverlay") === true) {
        return false;
      }

      if (!node.isListening()) {
        return false;
      }

      return portal.render.Util.haveIntersection(node.getClientRect(), portal.selectionRectangle.getClientRect());
    })
    .sort((left, right) => left.id().localeCompare(right.id()));

  applySelection(portal, { nextSelection });
}
