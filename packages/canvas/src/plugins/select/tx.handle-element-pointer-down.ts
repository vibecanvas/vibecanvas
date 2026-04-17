import { fnGetSelectionPath } from "./fn.get-selection-path";
import type { TCanvasSemanticsEditor } from "../../core/fx.canvas-node-semantics";
import type { SceneService } from "../../services/scene/SceneService";
import { fxIsCanvasGroupNode } from "../../core/fx.canvas-node-semantics";
import type { SelectionService } from "../../services/selection/SelectionService";
import type { TElementPointerEvent } from "../../runtime";

export type TPortalHandleElementPointerDown = {
  editor: TCanvasSemanticsEditor;
  render: SceneService;
  selection: SelectionService;
  hasSameSelectionOrder: (
    currentSelection: Array<{ id(): string }>,
    nextSelection: Array<{ id(): string }>,
  ) => boolean;
};

export type TArgsHandleElementPointerDown = {
  event: TElementPointerEvent;
};

function applySelection(
  portal: TPortalHandleElementPointerDown,
  args: { nextSelection: Parameters<SelectionService["setSelection"]>[0] },
) {
  if (portal.hasSameSelectionOrder(portal.selection.selection, args.nextSelection)) {
    return;
  }

  portal.selection.setSelection(args.nextSelection);
}

function applyFocusedNode(
  portal: TPortalHandleElementPointerDown,
  args: { node: Parameters<SelectionService["setFocusedNode"]>[0] },
) {
  portal.selection.setFocusedNode(args.node);
}

export function txHandleElementPointerDown(
  portal: TPortalHandleElementPointerDown,
  args: TArgsHandleElementPointerDown,
) {
  const path = fnGetSelectionPath({ render: portal.render, editor: portal.editor, node: args.event.currentTarget });
  const nextDepth = Math.min(Math.max(portal.selection.selection.length, 1), path.length);
  const nextSelection = path.slice(0, nextDepth);

  if (args.event.evt.shiftKey) {
    const focusedLevelNode = nextSelection.at(-1);
    if (!focusedLevelNode) {
      return true;
    }

    if (portal.selection.selection.includes(focusedLevelNode)) {
      portal.selection.setSelection(portal.selection.selection.filter((node) => node !== focusedLevelNode));
      if (portal.selection.focusedId === focusedLevelNode.id()) {
        portal.selection.setFocusedId(null);
      }
      return true;
    }

    portal.selection.setSelection([...portal.selection.selection, focusedLevelNode]);
    applyFocusedNode(portal, { node: focusedLevelNode });
    return true;
  }

  const topLevelNode = path[0];
  const isFlatMultiSelect = portal.selection.selection.length > 1
    && !portal.selection.selection.some((node) => fxIsCanvasGroupNode({}, { editor: portal.editor, node: node.getParent() }));

  if (isFlatMultiSelect && topLevelNode && portal.selection.selection.includes(topLevelNode)) {
    applyFocusedNode(portal, { node: topLevelNode });
    return true;
  }

  applySelection(portal, { nextSelection });
  applyFocusedNode(portal, { node: nextSelection.at(-1) ?? null });
  return true;
}
