import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { CanvasRegistryService } from "../../services/canvas-registry/CanvasRegistryService";
import type { CrdtService } from "../../services/crdt/CrdtService";
import type { HistoryService } from "../../services/history/HistoryService";
import type { RenderOrderService } from "../../services/render-order/RenderOrderService";
import type { SceneService } from "../../services/scene/SceneService";
import type { SelectionService } from "../../services/selection/SelectionService";

export type TPortalCreateShape2dCloneDrag = {
  Konva: typeof Konva;
  canvasRegistry: CanvasRegistryService;
  crdt: CrdtService;
  history: HistoryService;
  render: SceneService;
  renderOrder: RenderOrderService;
  selection: SelectionService;
  createId: () => string;
  now: () => number;
  createNode: (element: TElement) => Konva.Shape | null;
  setupNode: (node: Konva.Shape) => Konva.Shape;
  toElement: (node: Konva.Node) => TElement | null;
  cloneLinkedNodes?: (args: { sourceNode: Konva.Shape; clonedNode: Konva.Shape }) => {
    nodes: Konva.Node[];
    elements: TElement[];
  };
};

export type TArgsCreateShape2dCloneDrag = {
  node: Konva.Shape;
};

export function txCreateShape2dCloneDrag(
  portal: TPortalCreateShape2dCloneDrag,
  args: TArgsCreateShape2dCloneDrag,
) {
  const sourceElement = portal.toElement(args.node);
  if (!sourceElement) {
    return null;
  }

  const timestamp = portal.now();
  const previewClone = portal.createNode({
    ...sourceElement,
    id: portal.createId(),
    createdAt: timestamp,
    updatedAt: timestamp,
    parentGroupId: null,
    zIndex: "",
  });
  if (!previewClone) {
    return null;
  }

  previewClone.draggable(true);
  previewClone.listening(true);
  portal.render.dynamicLayer.add(previewClone);
  previewClone.startDrag();

  const finalizeCloneDrag = () => {
    previewClone.off("dragend", finalizeCloneDrag);
    if (previewClone.isDragging()) {
      previewClone.stopDrag();
    }

    previewClone.moveTo(portal.render.staticForegroundLayer);
    portal.setupNode(previewClone);
    portal.renderOrder.assignOrderOnInsert({
      parent: portal.render.staticForegroundLayer,
      nodes: [previewClone],
      position: "front",
    });

    const clonedElement = portal.toElement(previewClone);
    if (!clonedElement) {
      return;
    }

    const linkedClone = portal.cloneLinkedNodes?.({
      sourceNode: args.node,
      clonedNode: previewClone,
    }) ?? { nodes: [], elements: [] };
    const createdElements = [clonedElement, ...linkedClone.elements];

    const createBuilder = portal.crdt.build();
    createdElements.forEach((element) => {
      createBuilder.patchElement(element.id, element);
    });
    const createCommitResult = createBuilder.commit();

    portal.history.record({
      label: "clone-shape2d",
      undo() {
        [...linkedClone.nodes, previewClone].forEach((node) => {
          node.destroy();
        });
        createCommitResult.rollback();
        portal.selection.clear();
        portal.render.staticForegroundLayer.batchDraw();
      },
      redo() {
        const recreatedNodes = createdElements
          .map((element) => {
            const node = portal.canvasRegistry.createNodeFromElement(element);
            if (!node) {
              return null;
            }

            portal.render.staticForegroundLayer.add(node);
            return node;
          })
          .filter((node): node is Konva.Shape | Konva.Text => {
            return node instanceof portal.Konva.Shape || node instanceof portal.Konva.Text;
          });

        portal.renderOrder.sortChildren(portal.render.staticForegroundLayer);
        portal.crdt.applyOps({ ops: createCommitResult.redoOps });
        if (recreatedNodes.length > 0 && recreatedNodes[0] instanceof portal.Konva.Shape) {
          portal.selection.setSelection([recreatedNodes[0]]);
          portal.selection.setFocusedNode(recreatedNodes[0]);
        }
        portal.render.staticForegroundLayer.batchDraw();
      },
    });
    portal.selection.setSelection([previewClone]);
    portal.selection.setFocusedNode(previewClone);
    portal.render.dynamicLayer.batchDraw();
    portal.render.staticForegroundLayer.batchDraw();
  };

  previewClone.on("dragend", finalizeCloneDrag);
  return previewClone;
}
