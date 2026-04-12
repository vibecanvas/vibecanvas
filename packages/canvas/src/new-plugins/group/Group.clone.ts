import type { TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { RenderOrderService } from "../../new-services/render-order/RenderOrderService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import { getNodeZIndex, setNodeZIndex } from "../../core/render-order";

export type TGroupCloneRuntime = {
  crdt: CrdtService;
  editor: EditorService;
  render: RenderService;
  renderOrder: RenderOrderService;
  selection: SelectionService;
  setupGroupNode: (group: Konva.Group) => Konva.Group;
  createId: () => string;
};

function refreshCloneSubtree(runtime: TGroupCloneRuntime, clone: Konva.Group) {
  clone.id(runtime.createId());
  clone.setDraggable(true);
  clone.setAttr("vcGroupNodeSetup", false);

  clone.getChildren().forEach((node) => {
    if (node instanceof runtime.render.Group) {
      refreshCloneSubtree(runtime, node);
      return;
    }

    node.id(runtime.createId());
    node.setDraggable(false);
  });
}

function createPreviewClone(runtime: TGroupCloneRuntime, sourceGroup: Konva.Group) {
  const clone = sourceGroup.clone() as Konva.Group;
  refreshCloneSubtree(runtime, clone);
  return clone;
}

function registerSubtree(runtime: TGroupCloneRuntime, args: {
  sourceGroup: Konva.Group;
  cloneGroup: Konva.Group;
  groups: TGroup[];
  elements: TElement[];
}) {
  runtime.setupGroupNode(args.cloneGroup);
  const clonedGroup = runtime.editor.toGroup(args.cloneGroup);
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

    if (sourceChild instanceof runtime.render.Group && cloneChild instanceof runtime.render.Group) {
      registerSubtree(runtime, {
        sourceGroup: sourceChild,
        cloneGroup: cloneChild,
        groups: args.groups,
        elements: args.elements,
      });
      return;
    }

    if (!(cloneChild instanceof runtime.render.Shape)) {
      return;
    }

    runtime.editor.setupExistingShape(cloneChild);
    const sourceElement = runtime.editor.toElement(sourceChild);
    const clonedElement = runtime.editor.toElement(cloneChild);
    if (!sourceElement || !clonedElement) {
      return;
    }

    args.elements.push(clonedElement);
    runtime.editor.cloneElement({ sourceElement, clonedElement });
  });
}

export function startGroupCloneDrag(runtime: TGroupCloneRuntime, sourceGroup: Konva.Group) {
  const previewClone = createPreviewClone(runtime, sourceGroup);
  runtime.render.dynamicLayer.add(previewClone);
  previewClone.startDrag();
  runtime.selection.setSelection([previewClone]);
  runtime.selection.setFocusedNode(previewClone);

  const finalizeCloneDrag = () => {
    previewClone.off("dragend", finalizeCloneDrag);
    if (previewClone.isDragging()) {
      previewClone.stopDrag();
    }

    previewClone.moveTo(runtime.render.staticForegroundLayer);
    runtime.renderOrder.assignOrderOnInsert({
      parent: runtime.render.staticForegroundLayer,
      nodes: [previewClone],
      position: "front",
    });
    setNodeZIndex(previewClone, getNodeZIndex(sourceGroup));

    const groups: TGroup[] = [];
    const elements: TElement[] = [];
    registerSubtree(runtime, {
      sourceGroup,
      cloneGroup: previewClone,
      groups,
      elements,
    });

    runtime.crdt.patch({ elements, groups });
    runtime.selection.setSelection([previewClone]);
    runtime.selection.setFocusedNode(previewClone);
    runtime.render.dynamicLayer.batchDraw();
    runtime.render.staticForegroundLayer.batchDraw();
  };

  previewClone.on("dragend", finalizeCloneDrag);
  return previewClone;
}
