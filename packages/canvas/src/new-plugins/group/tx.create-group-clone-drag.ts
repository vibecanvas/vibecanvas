import type { TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { RenderOrderService } from "../../new-services/render-order/RenderOrderService";
import type { SceneService } from "../../new-services/scene/SceneService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import { fxGetCanvasNodeKind, fxIsCanvasGroupNode } from "../../core/fn.canvas-node-semantics";

export type TPortalCreateGroupCloneDrag = {
  crdt: CrdtService;
  editor: EditorService;
  render: SceneService;
  renderOrder: RenderOrderService;
  selection: SelectionService;
  setupGroupNode: (group: Konva.Group) => Konva.Group;
  createId: () => string;
  getNodeZIndex: (node: Konva.Group | Konva.Shape) => string;
  setNodeZIndex: (node: Konva.Group | Konva.Shape, zIndex: string) => void;
};

export type TArgsCreateGroupCloneDrag = {
  sourceGroup: Konva.Group;
};

function refreshCloneSubtree(
  portal: TPortalCreateGroupCloneDrag,
  clone: Konva.Group,
) {
  clone.id(portal.createId());
  clone.setDraggable(true);
  clone.setAttr("vcGroupNodeSetup", false);

  clone.getChildren().forEach((node) => {
    if (fxIsCanvasGroupNode({ editor: portal.editor, node })) {
      refreshCloneSubtree(portal, node as Konva.Group);
      return;
    }

    const kind = fxGetCanvasNodeKind({ editor: portal.editor, node });
    if (kind === "element") {
      node.id(portal.createId());
    }
    node.setDraggable(false);
  });
}

function createPreviewClone(
  portal: TPortalCreateGroupCloneDrag,
  sourceGroup: Konva.Group,
) {
  const clone = sourceGroup.clone() as Konva.Group;
  refreshCloneSubtree(portal, clone);
  return clone;
}

function registerSubtree(
  portal: TPortalCreateGroupCloneDrag,
  args: {
    sourceGroup: Konva.Group;
    cloneGroup: Konva.Group;
    groups: TGroup[];
    elements: TElement[];
  },
) {
  portal.setupGroupNode(args.cloneGroup);
  const clonedGroup = portal.editor.toGroup(args.cloneGroup);
  if (clonedGroup) {
    args.groups.push(clonedGroup);
  }

  const sourceChildren = args.sourceGroup.getChildren().slice();
  const cloneChildren = args.cloneGroup.getChildren().slice();

  cloneChildren.forEach((cloneChild, index) => {
    const sourceChild = sourceChildren[index];
    if (!sourceChild) {
      return;
    }

    if (
      fxIsCanvasGroupNode({ editor: portal.editor, node: sourceChild })
      && fxIsCanvasGroupNode({ editor: portal.editor, node: cloneChild })
    ) {
      registerSubtree(portal, {
        sourceGroup: sourceChild as Konva.Group,
        cloneGroup: cloneChild as Konva.Group,
        groups: args.groups,
        elements: args.elements,
      });
      return;
    }

    if (fxGetCanvasNodeKind({ editor: portal.editor, node: cloneChild }) !== "element") {
      return;
    }

    portal.editor.setupExistingShape(cloneChild);
    const sourceElement = portal.editor.toElement(sourceChild);
    const clonedElement = portal.editor.toElement(cloneChild);
    if (!sourceElement || !clonedElement) {
      return;
    }

    args.elements.push(clonedElement);
    portal.editor.cloneElement({ sourceElement, clonedElement });
  });
}

export function txCreateGroupCloneDrag(
  portal: TPortalCreateGroupCloneDrag,
  args: TArgsCreateGroupCloneDrag,
) {
  const previewClone = createPreviewClone(portal, args.sourceGroup);
  portal.render.dynamicLayer.add(previewClone);
  previewClone.startDrag();
  portal.selection.setSelection([previewClone]);
  portal.selection.setFocusedNode(previewClone);

  const finalizeCloneDrag = () => {
    previewClone.off("dragend", finalizeCloneDrag);
    if (previewClone.isDragging()) {
      previewClone.stopDrag();
    }

    previewClone.moveTo(portal.render.staticForegroundLayer);
    portal.renderOrder.assignOrderOnInsert({
      parent: portal.render.staticForegroundLayer,
      nodes: [previewClone],
      position: "front",
    });
    portal.setNodeZIndex(previewClone, portal.getNodeZIndex(args.sourceGroup));

    const groups: TGroup[] = [];
    const elements: TElement[] = [];
    registerSubtree(portal, {
      sourceGroup: args.sourceGroup,
      cloneGroup: previewClone,
      groups,
      elements,
    });

    portal.crdt.patch({ elements, groups });
    portal.selection.setSelection([previewClone]);
    portal.selection.setFocusedNode(previewClone);
    portal.render.dynamicLayer.batchDraw();
    portal.render.staticForegroundLayer.batchDraw();
  };

  previewClone.on("dragend", finalizeCloneDrag);
  return previewClone;
}
