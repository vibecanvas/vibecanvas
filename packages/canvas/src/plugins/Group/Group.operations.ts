import Konva from "konva";
import type { TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type { IPluginContext } from "../shared/interface";
import { Shape2dPlugin } from "../Shape2d/Shape2d.plugin";
import {
  expandSelectionsWithAttachedText,
  findGroupById,
  findNodesByIds,
  getInsertionPosition,
  toTGroup,
} from "./Group.helpers";
import type { GroupSelectionNode } from "./Group.shared";

type GroupOptions = { groupId?: string; recordHistory?: boolean };
type UngroupOptions = { recordHistory?: boolean };

function groupNodes(
  context: IPluginContext,
  selections: GroupSelectionNode[],
  args?: GroupOptions,
) {
  const expandedSelections = expandSelectionsWithAttachedText(context, selections)
    .slice()
    .sort((a, b) => a.zIndex() - b.zIndex());

  const resolveParent = (node: GroupSelectionNode) => {
    const candidate = node.getParent();
    return candidate instanceof Konva.Group || candidate instanceof Konva.Layer
      ? candidate
      : context.staticForegroundLayer;
  };

  const parent = resolveParent(expandedSelections[0]);
  if (!expandedSelections.every((node) => resolveParent(node) === parent)) {
    throw new Error("Cannot group selections from different parents");
  }

  const insertionPosition = getInsertionPosition(parent, expandedSelections);
  const x = Math.min(...expandedSelections.map((node) => node.x()));
  const y = Math.min(...expandedSelections.map((node) => node.y()));
  const width = Math.max(...expandedSelections.map((node) => node.x() + node.width())) - x;
  const height = Math.max(...expandedSelections.map((node) => node.y() + node.height())) - y;
  const selectionIds = expandedSelections.map((node) => node.id());
  const groupId = args?.groupId ?? crypto.randomUUID();

  const newGroup = context.capabilities.createGroupFromTGroup?.({
    id: groupId,
    parentGroupId: parent instanceof Konva.Group ? parent.id() : null,
    zIndex: "",
    locked: false,
    createdAt: Date.now(),
  }) ?? new Konva.Group({ id: groupId, draggable: true });

  newGroup.setAttrs({ x, y, width, height, draggable: true });
  parent.add(newGroup);
  context.capabilities.renderOrder?.assignOrderOnInsert({
    parent,
    nodes: [newGroup],
    position: insertionPosition,
  });

  const groupPatches: TGroup[] = [context.capabilities.toGroup?.(newGroup) ?? toTGroup(newGroup)];
  const elementPatches: TElement[] = [];

  expandedSelections.forEach((node) => {
    const absolutePosition = node.getAbsolutePosition();
    newGroup.add(node);
    node.setAbsolutePosition(absolutePosition);
    node.setDraggable(false);

    if (node instanceof Konva.Group) {
      groupPatches.push(context.capabilities.toGroup?.(node) ?? toTGroup(node));
      return;
    }

    const element = context.capabilities.toElement?.(node) ?? Shape2dPlugin.toTElement(node);
    elementPatches.push(element);
  });

  context.capabilities.renderOrder?.sortChildren(newGroup);
  context.crdt.patch({ elements: elementPatches, groups: groupPatches });

  if (args?.recordHistory !== false) {
    context.history.record({
      label: "group",
      undo: () => {
        const existingGroup = findGroupById(context, newGroup.id());
        if (!existingGroup) return;
        const children = ungroupNodes(context, existingGroup, { recordHistory: false });
        context.setState("selection", children);
      },
      redo: () => {
        const nodes = findNodesByIds(context, selectionIds);
        if (nodes.length !== selectionIds.length) return;
        const regrouped = groupNodes(context, nodes, {
          groupId: newGroup.id(),
          recordHistory: false,
        });
        context.setState("selection", [regrouped]);
      },
    });
  }

  return newGroup;
}

function ungroupNodes(context: IPluginContext, group: Konva.Group, args?: UngroupOptions) {
  const parent = group.getParent();
  if (!(parent instanceof Konva.Group || parent instanceof Konva.Layer)) return [];

  const insertionPosition = getInsertionPosition(parent, [group]);
  const children = group.getChildren().slice() as GroupSelectionNode[];
  const childIds = children.map((node) => node.id());
  const elementPatches: TElement[] = [];
  const groupPatches: TGroup[] = [];

  children.forEach((node) => {
    const absolutePosition = node.getAbsolutePosition();
    parent.add(node);
    node.setAbsolutePosition(absolutePosition);

    if (node instanceof Konva.Group) {
      groupPatches.push(context.capabilities.toGroup?.(node) ?? toTGroup(node));
      return;
    }

    node.setDraggable(true);
    const element = context.capabilities.toElement?.(node) ?? Shape2dPlugin.toTElement(node);
    elementPatches.push(element);
  });

  group.destroy();
  context.capabilities.renderOrder?.assignOrderOnInsert({
    parent,
    nodes: children,
    position: insertionPosition,
  });
  context.crdt.patch({ elements: elementPatches, groups: groupPatches });
  context.crdt.deleteById({ groupIds: [group.id()] });

  if (args?.recordHistory !== false) {
    context.history.record({
      label: "ungroup",
      undo: () => {
        const nodes = findNodesByIds(context, childIds);
        if (nodes.length !== childIds.length) return;
        const regrouped = groupNodes(context, nodes, {
          groupId: group.id(),
          recordHistory: false,
        });
        context.setState("selection", [regrouped]);
      },
      redo: () => {
        const existingGroup = findGroupById(context, group.id());
        if (!existingGroup) return;
        const ungroupedChildren = ungroupNodes(context, existingGroup, { recordHistory: false });
        context.setState("selection", ungroupedChildren);
      },
    });
  }

  return children;
}

export { groupNodes, ungroupNodes };
