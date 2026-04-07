import Konva from "konva";
import type { TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc";
import { PenPlugin } from "../Pen/Pen.plugin";
import { Shape1dPlugin } from "../Shape1d/Shape1d.plugin";
import { Shape2dPlugin } from "../Shape2d/Shape2d.plugin";
import { TextPlugin } from "../Text/Text.plugin";
import type { IPluginContext } from "../shared/interface";
import { toTGroup } from "./Group.helpers";

type GroupCloneRuntime = {
  context: IPluginContext;
  setupGroupListeners: (context: IPluginContext, group: Konva.Group) => void;
};

function refreshCloneSubtree(clone: Konva.Group) {
  clone.id(crypto.randomUUID());
  clone.setDraggable(true);
  clone.setAttr("vcGroupListenersSetup", false);

  clone.getChildren().forEach((node) => {
    if (node instanceof Konva.Group) {
      refreshCloneSubtree(node);
      return;
    }

    node.id(crypto.randomUUID());
    node.setDraggable(false);
  });
}

function rebuildShape1dCloneChildren(sourceGroup: Konva.Group, cloneGroup: Konva.Group) {
  const sourceChildren = sourceGroup.getChildren();
  const cloneChildren = cloneGroup.getChildren().slice();

  sourceChildren.forEach((sourceNode, index) => {
    const cloneNode = cloneChildren[index];
    if (!cloneNode) return;

    if (sourceNode instanceof Konva.Group && cloneNode instanceof Konva.Group) {
      rebuildShape1dCloneChildren(sourceNode, cloneNode);
      return;
    }

    if (!Shape1dPlugin.isShape1dNode(sourceNode)) return;
    if (!(cloneNode instanceof Konva.Shape)) return;
    if (Shape1dPlugin.hasRenderableRuntime(cloneNode as Konva.Node)) return;

    const cloneShape = cloneNode as Konva.Shape;
    const replacement = Shape1dPlugin.createShapeFromElement(Shape1dPlugin.toTElement(sourceNode));
    const parent = cloneShape.getParent();
    if (!(parent instanceof Konva.Group)) return;

    const originalAttrs = cloneShape.getAttrs();
    const cloneLocalX = cloneShape.x();
    const cloneLocalY = cloneShape.y();
    const cloneRotation = cloneShape.rotation();
    const cloneScaleX = cloneShape.scaleX();
    const cloneScaleY = cloneShape.scaleY();
    const cloneIndex = cloneChildren.indexOf(cloneShape);

    cloneShape.destroy();
    parent.add(replacement);
    replacement.position({ x: cloneLocalX, y: cloneLocalY });
    replacement.rotation(cloneRotation);
    replacement.scale({ x: cloneScaleX, y: cloneScaleY });

    const { x, y, rotation, scaleX, scaleY, ...remainingAttrs } = originalAttrs;
    replacement.setAttrs({ ...remainingAttrs, id: replacement.id() });
    replacement.zIndex(cloneIndex);
  });
}

function createPreviewClone(group: Konva.Group) {
  const clone = Konva.Node.create(group.toJSON()) as Konva.Group;
  rebuildShape1dCloneChildren(group, clone);
  refreshCloneSubtree(clone);
  return clone;
}

function finalizePreviewClone(runtime: GroupCloneRuntime, clone: Konva.Group) {
  const { context, setupGroupListeners } = runtime;

  if (clone.isDragging()) {
    clone.stopDrag();
  }

  clone.moveTo(context.staticForegroundLayer);
  context.capabilities.renderOrder?.assignOrderOnInsert({
    parent: context.staticForegroundLayer,
    nodes: [clone],
    position: "front",
  });

  const groups: TGroup[] = [];
  const elements: TElement[] = [];

  const registerSubtree = (group: Konva.Group) => {
    setupGroupListeners(context, group);
    groups.push((context.capabilities.toGroup?.(group) ?? toTGroup(group)) as TGroup);
    group.setDraggable(false);

    group.getChildren().forEach((node) => {
      if (node instanceof Konva.Group) {
        registerSubtree(node);
        return;
      }

      if (!(node instanceof Konva.Shape)) return;

      if (node instanceof Konva.Text) {
        TextPlugin.setupShapeListeners(context, node);
      } else if (node instanceof Konva.Path && !Shape1dPlugin.isShape1dNode(node)) {
        PenPlugin.setupShapeListeners(context, node);
      } else if (Shape1dPlugin.isShape1dNode(node)) {
        Shape1dPlugin.setupShapeListeners(context, node);
      } else {
        Shape2dPlugin.setupShapeListeners(context, node);
      }

      node.setDraggable(false);
      const element = context.capabilities.toElement?.(node);
      if (element) elements.push(element);
    });
  };

  registerSubtree(clone);
  context.crdt.patch({ elements, groups });
  return clone;
}

function startSingleCloneDrag(runtime: GroupCloneRuntime, group: Konva.Group) {
  const { context, setupGroupListeners } = runtime;
  const clone = createPreviewClone(group);

  context.dynamicLayer.add(clone);
  setupGroupListeners(context, clone);
  context.setState("selection", [clone]);

  clone.startDrag();
  const finalizeCloneDrag = () => {
    clone.off("dragend", finalizeCloneDrag);
    const finalizedClone = finalizePreviewClone({ context, setupGroupListeners }, clone);
    context.setState("selection", finalizedClone ? [finalizedClone] : []);
  };
  clone.on("dragend", finalizeCloneDrag);

  return clone;
}

export {
  createPreviewClone,
  finalizePreviewClone,
  rebuildShape1dCloneChildren,
  refreshCloneSubtree,
  startSingleCloneDrag,
};
