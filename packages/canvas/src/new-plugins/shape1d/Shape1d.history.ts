import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { RenderOrderService } from "../../new-services/render-order/RenderOrderService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import type { ThemeService } from "../../new-services/theme/ThemeService";
import { createShapeFromElement } from "./Shape1d.render";
import { findShape1dNodeById, type TShape1dNode } from "./Shape1d.shared";

export type TPortalRecordShape1dHistory = {
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  render: RenderService;
  renderOrder: RenderOrderService;
  selection: SelectionService;
  theme: ThemeService;
  setupNode: (node: TShape1dNode) => TShape1dNode;
};

export function recordElementHistory(
  portal: Pick<TPortalRecordShape1dHistory, "crdt" | "editor" | "history">,
  payload: {
    beforeElement: TElement;
    afterElement: TElement;
    label: string;
  },
) {
  const { beforeElement, afterElement, label } = payload;
  if (JSON.stringify(beforeElement) === JSON.stringify(afterElement)) {
    return;
  }

  portal.history.record({
    label,
    undo() {
      portal.editor.updateShapeFromTElement(beforeElement);
      portal.crdt.patch({ elements: [beforeElement], groups: [] });
    },
    redo() {
      portal.editor.updateShapeFromTElement(afterElement);
      portal.crdt.patch({ elements: [afterElement], groups: [] });
    },
  });
}

export function recordCreateHistory(
  portal: TPortalRecordShape1dHistory,
  payload: {
    element: TElement;
    node: TShape1dNode;
    label: string;
  },
) {
  const { element, node, label } = payload;
  const snapshot = structuredClone(element);

  portal.history.record({
    label,
    undo() {
      const currentNode = findShape1dNodeById(portal.render, snapshot.id);
      currentNode?.destroy();
      portal.crdt.deleteById({ elementIds: [snapshot.id] });

      const nextSelection = portal.selection.selection.filter((candidate) => candidate.id() !== snapshot.id);
      portal.selection.setSelection(nextSelection);
      if (portal.selection.focusedId === snapshot.id) {
        portal.selection.setFocusedId(nextSelection.at(-1)?.id() ?? null);
      }

      portal.render.staticForegroundLayer.batchDraw();
    },
    redo() {
      let currentNode = findShape1dNodeById(portal.render, snapshot.id);
      if (!currentNode) {
        currentNode = portal.setupNode(createShapeFromElement(portal.theme, snapshot));
        currentNode.setDraggable(true);
        portal.render.staticForegroundLayer.add(currentNode);
      }

      portal.editor.updateShapeFromTElement(snapshot);
      portal.renderOrder.sortChildren(portal.render.staticForegroundLayer);
      portal.crdt.patch({ elements: [snapshot], groups: [] });
      portal.selection.setSelection([currentNode]);
      portal.selection.setFocusedNode(currentNode);
      portal.render.staticForegroundLayer.batchDraw();
    },
  });

  portal.selection.setSelection([node]);
  portal.selection.setFocusedNode(node);
}
