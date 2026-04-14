import type { TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { SceneService } from "../../new-services/scene/SceneService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import { fxGetCanvasNodeKind, fxIsCanvasGroupNode } from "../../core/fx.canvas-node-semantics";
import { fxGetSelectionBounds } from "./fn.get-selection-bounds";
import { fxFindSceneNodeById, fxGetGroupChildren, fxGetSelectionGroupParent, fxIsSceneParent, type TSceneNode } from "./fn.scene-node";
import { fxToGroupPatch } from "./fn.to-group-patch";

export type TPortalUngroupSelection = {
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  render: SceneService;
  selection: SelectionService;
  setupNode: (group: Konva.Group) => Konva.Group;
  createGroupNode: (group: TGroup) => Konva.Group;
  getNodeZIndex: (node: Konva.Group) => string;
  now: () => number;
};

export type TArgsUngroupSelection = Record<string, never>;

export function txUngroupSelection(
  portal: TPortalUngroupSelection,
  args: TArgsUngroupSelection,
) {
  const group = [...portal.selection.selection].reverse().find((node): node is Konva.Group => {
    return fxIsCanvasGroupNode({}, { editor: portal.editor, node });
  });
  if (!group) {
    return;
  }

  const parentNode = group.getParent();
  if (!fxIsSceneParent({ render: portal.render, node: parentNode })) {
    return;
  }

  const parent = parentNode as Konva.Group | Konva.Layer;

  const children = fxGetGroupChildren({ group, render: portal.render });
  const childIds = children.map((child) => child.id());
  const groupPatch = portal.editor.toGroup(group);
  const elementPatches: TElement[] = [];
  const nestedGroupPatches: TGroup[] = [];

  children.forEach((child) => {
    const absolutePosition = child.getAbsolutePosition();
    parent.add(child);
    child.setAbsolutePosition(absolutePosition);

    const kind = fxGetCanvasNodeKind({}, { editor: portal.editor, node: child });
    if (kind === "group") {
      const patch = portal.editor.toGroup(child);
      if (patch) {
        nestedGroupPatches.push(patch);
      }
      return;
    }

    if (kind === "element") {
      const element = portal.editor.toElement(child);
      if (element) {
        elementPatches.push(element);
      }
    }
  });

  group.destroy();
  portal.crdt.patch({ elements: elementPatches, groups: nestedGroupPatches });
  portal.crdt.deleteById({ groupIds: [group.id()] });
  portal.selection.setSelection(children);
  portal.selection.setFocusedNode(children.at(-1) ?? null);
  portal.render.staticForegroundLayer.batchDraw();

  if (!groupPatch) {
    return;
  }

  portal.history.record({
    label: "ungroup",
    undo() {
      const currentNodes = childIds
        .map((id) => fxFindSceneNodeById({ render: portal.render, id }))
        .filter((node): node is TSceneNode => node !== null);

      if (currentNodes.length !== childIds.length) {
        return;
      }

      const currentParent = fxGetSelectionGroupParent({ render: portal.render, selection: currentNodes });
      if (!currentParent) {
        return;
      }

      const recreated = portal.setupNode(portal.createGroupNode(groupPatch));
      currentParent.add(recreated);
      const bounds = fxGetSelectionBounds({ selection: currentNodes });
      recreated.position({ x: bounds.x, y: bounds.y });
      recreated.setAttr("width", bounds.width);
      recreated.setAttr("height", bounds.height);

      const undoElementPatches: TElement[] = [];
      const undoGroupPatches: TGroup[] = [fxToGroupPatch({
        editor: portal.editor,
        render: portal.render,
        group: recreated,
        getNodeZIndex: portal.getNodeZIndex,
        fallbackCreatedAt: portal.now(),
      })];

      currentNodes.forEach((node) => {
        const absolutePosition = node.getAbsolutePosition();
        recreated.add(node);
        node.setAbsolutePosition(absolutePosition);

        const kind = fxGetCanvasNodeKind({}, { editor: portal.editor, node });
        if (kind === "group") {
          const patch = portal.editor.toGroup(node);
          if (patch) {
            undoGroupPatches.push(patch);
          }
          return;
        }

        if (kind === "element") {
          const element = portal.editor.toElement(node);
          if (element) {
            undoElementPatches.push(element);
          }
        }
      });

      portal.crdt.patch({ elements: undoElementPatches, groups: undoGroupPatches });
      portal.selection.setSelection([recreated]);
      portal.selection.setFocusedNode(recreated);
      portal.render.staticForegroundLayer.batchDraw();
    },
    redo() {
      const currentGroupNode = fxFindSceneNodeById({ render: portal.render, id: groupPatch.id });
      if (!fxIsCanvasGroupNode({}, { editor: portal.editor, node: currentGroupNode })) {
        return;
      }

      const currentGroup = currentGroupNode as Konva.Group;
      const redoChildren = fxGetGroupChildren({ group: currentGroup, render: portal.render });
      const redoParentNode = currentGroup.getParent();
      if (!fxIsSceneParent({ render: portal.render, node: redoParentNode })) {
        return;
      }

      const redoParent = redoParentNode as Konva.Group | Konva.Layer;

      const redoElementPatches: TElement[] = [];
      const redoGroupPatches: TGroup[] = [];

      redoChildren.forEach((child) => {
        const absolutePosition = child.getAbsolutePosition();
        redoParent.add(child);
        child.setAbsolutePosition(absolutePosition);

        const kind = fxGetCanvasNodeKind({}, { editor: portal.editor, node: child });
        if (kind === "group") {
          const patch = portal.editor.toGroup(child);
          if (patch) {
            redoGroupPatches.push(patch);
          }
          return;
        }

        if (kind === "element") {
          const element = portal.editor.toElement(child);
          if (element) {
            redoElementPatches.push(element);
          }
        }
      });

      currentGroup.destroy();
      portal.crdt.patch({ elements: redoElementPatches, groups: redoGroupPatches });
      portal.crdt.deleteById({ groupIds: [groupPatch.id] });
      portal.selection.setSelection(redoChildren);
      portal.selection.setFocusedNode(redoChildren.at(-1) ?? null);
      portal.render.staticForegroundLayer.batchDraw();
    },
  });

  void args;
}
