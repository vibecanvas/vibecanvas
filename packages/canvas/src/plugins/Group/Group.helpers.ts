import Konva from "konva";
import type { TGroup } from "@vibecanvas/service-automerge/types/canvas-doc";
import type { IPluginContext } from "../shared/interface";
import { getNodeZIndex } from "../shared/render-order.shared";
import type { GroupSelectionNode } from "./Group.shared";

function expandSelectionsWithAttachedText(
  context: IPluginContext,
  selections: GroupSelectionNode[],
) {
  const expanded = [...selections];
  const seen = new Set(expanded.map((node) => node.id()));

  selections.forEach((node) => {
    if (!(node instanceof Konva.Rect)) return;

    const attachedText = context.staticForegroundLayer.findOne((candidate: Konva.Node) => {
      return candidate instanceof Konva.Text && candidate.getAttr("vcContainerId") === node.id();
    });

    if (!(attachedText instanceof Konva.Text)) return;
    if (seen.has(attachedText.id())) return;

    expanded.push(attachedText);
    seen.add(attachedText.id());
  });

  return expanded;
}

function findNodeById(context: IPluginContext, id: string) {
  return context.staticForegroundLayer.findOne((node: Konva.Node) => {
    return (node instanceof Konva.Group || node instanceof Konva.Shape) && node.id() === id;
  }) as GroupSelectionNode | null;
}

function findGroupById(context: IPluginContext, id: string) {
  const node = findNodeById(context, id);
  return node instanceof Konva.Group ? node : null;
}

function findNodesByIds(context: IPluginContext, ids: string[]) {
  return ids
    .map((id) => findNodeById(context, id))
    .filter((node): node is GroupSelectionNode => Boolean(node));
}

function getInsertionPosition(
  parent: Konva.Layer | Konva.Group,
  nodes: GroupSelectionNode[],
): "front" | "back" | { beforeId?: string; afterId?: string } {
  const siblingIds = parent.getChildren()
    .filter((node): node is GroupSelectionNode => node instanceof Konva.Group || node instanceof Konva.Shape)
    .map((node) => node.id());
  const selectedIds = new Set(nodes.map((node) => node.id()));
  const selectedIndexes = siblingIds
    .map((id, index) => (selectedIds.has(id) ? index : -1))
    .filter((index) => index >= 0);

  if (selectedIndexes.length === 0) return "front";

  const firstIndex = Math.min(...selectedIndexes);
  const lastIndex = Math.max(...selectedIndexes);
  const beforeId = siblingIds[firstIndex - 1];
  const afterId = siblingIds[lastIndex + 1];

  if (beforeId) return { afterId: beforeId };
  if (afterId) return { beforeId: afterId };
  return "front";
}

function toTGroup(group: Konva.Group): TGroup {
  const parentGroupId = group.getParent() instanceof Konva.Group ? group.getParent()!.id() : null;
  return {
    id: group.id(),
    parentGroupId,
    zIndex: getNodeZIndex(group),
    locked: false,
    createdAt: Date.now(),
  };
}

export {
  expandSelectionsWithAttachedText,
  findGroupById,
  findNodeById,
  findNodesByIds,
  getInsertionPosition,
  toTGroup,
};
