import type { TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { CanvasRegistryService } from "../../services/canvas-registry/CanvasRegistryService";
import type { CrdtService } from "../../services/crdt/CrdtService";
import type { RenderOrderService } from "../../services/render-order/RenderOrderService";
import type { SceneService } from "../../services/scene/SceneService";
import type { SelectionService } from "../../services/selection/SelectionService";
import { fnGetCanvasNodeKind, fnIsCanvasGroupNode } from "../../core/fn.canvas-node-semantics";

export type TPortalCreateGroupCloneDrag = {
  canvasRegistry: CanvasRegistryService;
  crdt: CrdtService;
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
    if (fnIsCanvasGroupNode({ editor: portal.canvasRegistry, node })) {
      refreshCloneSubtree(portal, node as Konva.Group);
      return;
    }

    const kind = fnGetCanvasNodeKind({ editor: portal.canvasRegistry, node });
    if (kind !== null) {
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
  const clonedGroup = portal.canvasRegistry.toGroup(args.cloneGroup);
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
      fnIsCanvasGroupNode({ editor: portal.canvasRegistry, node: sourceChild })
      && fnIsCanvasGroupNode({ editor: portal.canvasRegistry, node: cloneChild })
    ) {
      registerSubtree(portal, {
        sourceGroup: sourceChild as Konva.Group,
        cloneGroup: cloneChild as Konva.Group,
        groups: args.groups,
        elements: args.elements,
      });
      return;
    }

    if (fnGetCanvasNodeKind({ editor: portal.canvasRegistry, node: cloneChild }) === null) {
      return;
    }

    portal.canvasRegistry.attachListeners(cloneChild);
    const clonedElement = portal.canvasRegistry.toElement(cloneChild);
    if (!clonedElement) {
      return;
    }

    args.elements.push(clonedElement);
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

    const builder = portal.crdt.build();
    elements.forEach((element) => {
      builder.patchElement(element.id, element);
    });
    groups.forEach((group) => {
      builder.patchGroup(group.id, group);
    });
    builder.commit();
    portal.selection.setSelection([previewClone]);
    portal.selection.setFocusedNode(previewClone);
    portal.render.dynamicLayer.batchDraw();
    portal.render.staticForegroundLayer.batchDraw();
  };

  previewClone.on("dragend", finalizeCloneDrag);
  return previewClone;
}
