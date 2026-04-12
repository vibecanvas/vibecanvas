import type { TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import { fxGetSelectionBounds } from "./fn.get-selection-bounds";
import { fxFindSceneNodeById, fxGetGroupChildren, fxGetSelectionGroupParent, fxIsSceneParent, fxIsSceneNode, type TSceneNode } from "./fn.scene-node";
import { fxToGroupPatch } from "./fn.to-group-patch";

export type TPortalGroupSelection = {
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  render: RenderService;
  selection: SelectionService;
  setupNode: (group: Konva.Group) => Konva.Group;
  createGroupNode: (group: TGroup) => Konva.Group;
  sortChildrenByPersistedOrder: (parent: Konva.Layer | Konva.Group) => void;
  getNodeZIndex: (node: TSceneNode) => string;
  now: () => number;
  createId: () => string;
};

export type TArgsGroupSelection = Record<string, never>;

export function txGroupSelection(
  portal: TPortalGroupSelection,
  args: TArgsGroupSelection,
) {
  const selection = portal.selection.selection.filter((node): node is TSceneNode => {
    return fxIsSceneNode({ render: portal.render, node });
  });
  if (selection.length <= 1) {
    return;
  }

  const parent = fxGetSelectionGroupParent({ render: portal.render, selection });
  if (!parent) {
    return;
  }

  const bounds = fxGetSelectionBounds({ selection });
  const createdAt = portal.now();
  const groupId = portal.createId();
  const zIndex = portal.getNodeZIndex(selection[selection.length - 1] ?? selection[0]);
  const groupNode = portal.setupNode(portal.createGroupNode({
    id: groupId,
    parentGroupId: parent instanceof portal.render.Group ? parent.id() : null,
    zIndex,
    locked: false,
    createdAt,
  }));

  groupNode.position({ x: bounds.x, y: bounds.y });
  groupNode.setAttr("width", bounds.width);
  groupNode.setAttr("height", bounds.height);
  parent.add(groupNode);

  const elementPatches: TElement[] = [];
  const groupPatches: TGroup[] = [fxToGroupPatch({
    render: portal.render,
    group: groupNode,
    getNodeZIndex: portal.getNodeZIndex,
    fallbackCreatedAt: createdAt,
  })];

  selection.forEach((node) => {
    const absolutePosition = node.getAbsolutePosition();
    groupNode.add(node);
    node.setAbsolutePosition(absolutePosition);

    if (node instanceof portal.render.Group) {
      const groupPatch = portal.editor.toGroup(node);
      if (groupPatch) {
        groupPatches.push(groupPatch);
      }
      return;
    }

    const element = portal.editor.toElement(node);
    if (element) {
      elementPatches.push(element);
    }
  });

  portal.sortChildrenByPersistedOrder(groupNode);
  portal.crdt.patch({ elements: elementPatches, groups: groupPatches });
  portal.selection.setSelection([groupNode]);
  portal.selection.setFocusedNode(groupNode);
  portal.render.staticForegroundLayer.batchDraw();

  const childIds = selection.map((node) => node.id());

  portal.history.record({
    label: "group",
    undo() {
      const currentGroup = fxFindSceneNodeById({ render: portal.render, id: groupId });
      if (!(currentGroup instanceof portal.render.Group)) {
        return;
      }

      const children = fxGetGroupChildren({ group: currentGroup, render: portal.render });
      const currentParent = currentGroup.getParent();
      if (!fxIsSceneParent({ render: portal.render, node: currentParent })) {
        return;
      }

      const undoElementPatches: TElement[] = [];
      const undoGroupPatches: TGroup[] = [];

      children.forEach((child) => {
        const absolutePosition = child.getAbsolutePosition();
        currentParent.add(child);
        child.setAbsolutePosition(absolutePosition);

        if (child instanceof portal.render.Group) {
          const patch = portal.editor.toGroup(child);
          if (patch) {
            undoGroupPatches.push(patch);
          }
          return;
        }

        const element = portal.editor.toElement(child);
        if (element) {
          undoElementPatches.push(element);
        }
      });

      currentGroup.destroy();
      portal.crdt.patch({ elements: undoElementPatches, groups: undoGroupPatches });
      portal.crdt.deleteById({ groupIds: [groupId] });
      portal.selection.setSelection(children);
      portal.selection.setFocusedNode(children.at(-1) ?? null);
      portal.render.staticForegroundLayer.batchDraw();
    },
    redo() {
      const nodes = childIds
        .map((id) => fxFindSceneNodeById({ render: portal.render, id }))
        .filter((node): node is TSceneNode => node !== null);

      if (nodes.length !== childIds.length) {
        return;
      }

      const redoParent = fxGetSelectionGroupParent({ render: portal.render, selection: nodes });
      if (!redoParent) {
        return;
      }

      const recreated = portal.setupNode(portal.createGroupNode({
        id: groupId,
        parentGroupId: redoParent instanceof portal.render.Group ? redoParent.id() : null,
        zIndex,
        locked: false,
        createdAt,
      }));
      const redoBounds = fxGetSelectionBounds({ selection: nodes });
      recreated.position({ x: redoBounds.x, y: redoBounds.y });
      recreated.setAttr("width", redoBounds.width);
      recreated.setAttr("height", redoBounds.height);
      redoParent.add(recreated);

      const redoElementPatches: TElement[] = [];
      const redoGroupPatches: TGroup[] = [fxToGroupPatch({
        render: portal.render,
        group: recreated,
        getNodeZIndex: portal.getNodeZIndex,
        fallbackCreatedAt: createdAt,
      })];

      nodes.forEach((node) => {
        const absolutePosition = node.getAbsolutePosition();
        recreated.add(node);
        node.setAbsolutePosition(absolutePosition);

        if (node instanceof portal.render.Group) {
          const patch = portal.editor.toGroup(node);
          if (patch) {
            redoGroupPatches.push(patch);
          }
          return;
        }

        const element = portal.editor.toElement(node);
        if (element) {
          redoElementPatches.push(element);
        }
      });

      portal.sortChildrenByPersistedOrder(recreated);
      portal.crdt.patch({ elements: redoElementPatches, groups: redoGroupPatches });
      portal.selection.setSelection([recreated]);
      portal.selection.setFocusedNode(recreated);
      portal.render.staticForegroundLayer.batchDraw();
    },
  });

  void args;
}
