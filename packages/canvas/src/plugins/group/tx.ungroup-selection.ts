import type { TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { CanvasRegistryService } from "../../services/canvas-registry/CanvasRegistryService";
import type { CrdtService } from "../../services/crdt/CrdtService";
import type { HistoryService } from "../../services/history/HistoryService";
import type { SceneService } from "../../services/scene/SceneService";
import type { SelectionService } from "../../services/selection/SelectionService";
import { fnGetCanvasNodeKind, fnIsCanvasGroupNode } from "../../core/fn.canvas-node-semantics";
import { fnGetSelectionBounds } from "./fn.get-selection-bounds";
import { fnFindSceneNodeById, fnGetGroupChildren, fnGetSelectionGroupParent, fnIsSceneParent, type TSceneNode } from "./fn.scene-node";
import { fnToGroupPatch } from "./fn.to-group-patch";

export type TPortalUngroupSelection = {
  Group: typeof Konva.Group;
  Shape: typeof Konva.Shape;
  Layer: typeof Konva.Layer;
  canvasRegistry: CanvasRegistryService;
  crdt: CrdtService;
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
    return fnIsCanvasGroupNode(node);
  });
  if (!group) {
    return;
  }

  const parentNode = group.getParent();
  if (!fnIsSceneParent({ render: portal.render, node: parentNode })) {
    return;
  }

  const parent = parentNode as Konva.Group | Konva.Layer;
  const children = fnGetGroupChildren({ group, render: portal.render });
  const childIds = children.map((child) => child.id());
  const groupPatch = portal.canvasRegistry.toGroup(group);
  const elementPatches: TElement[] = [];
  const nestedGroupPatches: TGroup[] = [];

  children.forEach((child) => {
    const absolutePosition = child.getAbsolutePosition();
    parent.add(child);
    child.setAbsolutePosition(absolutePosition);

    const kind = fnGetCanvasNodeKind(child);
    if (kind === "group") {
      const patch = portal.canvasRegistry.toGroup(child);
      if (patch) {
        nestedGroupPatches.push(patch);
      }
      return;
    }

    if (kind !== null) {
      const element = portal.canvasRegistry.toElement(child);
      if (element) {
        elementPatches.push(element);
        portal.canvasRegistry.updateElement(element);
      }
    }
  });

  group.destroy();
  const commitResult = (() => {
    const builder = portal.crdt.build();
    elementPatches.forEach((element) => {
      builder.patchElement(element.id, element);
    });
    nestedGroupPatches.forEach((nestedGroup) => {
      builder.patchGroup(nestedGroup.id, nestedGroup);
    });
    builder.deleteGroup(group.id());
    return builder.commit();
  })();
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
        .map((id) => fnFindSceneNodeById({ render: portal.render, id }))
        .filter((node): node is TSceneNode => node !== null);

      if (currentNodes.length !== childIds.length) {
        return;
      }

      const currentParent = fnGetSelectionGroupParent({ render: portal.render, selection: currentNodes });
      if (!currentParent) {
        return;
      }

      const recreated = portal.setupNode(portal.createGroupNode(groupPatch));
      currentParent.add(recreated);
      const bounds = fnGetSelectionBounds({ selection: currentNodes });
      recreated.position({ x: bounds.x, y: bounds.y });
      recreated.setAttr("width", bounds.width);
      recreated.setAttr("height", bounds.height);

      fnToGroupPatch({
        canvasRegistry: portal.canvasRegistry,
        group: recreated,
        getNodeZIndex: portal.getNodeZIndex,
        fallbackCreatedAt: portal.now(),
      });

      currentNodes.forEach((node) => {
        const absolutePosition = node.getAbsolutePosition();
        recreated.add(node);
        node.setAbsolutePosition(absolutePosition);

        const kind = fnGetCanvasNodeKind(node);
        if (kind === "group") {
          return;
        }

        if (kind !== null) {
          const element = portal.canvasRegistry.toElement(node);
          if (element) {
            portal.canvasRegistry.updateElement(element);
          }
        }
      });

      portal.selection.setSelection([recreated]);
      portal.selection.setFocusedNode(recreated);
      commitResult.rollback();
      portal.render.staticForegroundLayer.batchDraw();
    },
    redo() {
      const currentGroupNode = fnFindSceneNodeById({ render: portal.render, id: groupPatch.id });
      if (currentGroupNode && !fnIsCanvasGroupNode(currentGroupNode)) {
        return;
      }

      const currentGroup = currentGroupNode as Konva.Group;
      const redoChildren = fnGetGroupChildren({ group: currentGroup, render: portal.render });
      const redoParentNode = currentGroup.getParent();
      if (!fnIsSceneParent({ render: portal.render, node: redoParentNode })) {
        return;
      }

      const redoParent = redoParentNode as Konva.Group | Konva.Layer;

      redoChildren.forEach((child) => {
        const absolutePosition = child.getAbsolutePosition();
        redoParent.add(child);
        child.setAbsolutePosition(absolutePosition);

        const kind = fnGetCanvasNodeKind(child);
        if (kind === "group") {
          return;
        }

        if (kind !== null) {
          const element = portal.canvasRegistry.toElement(child);
          if (element) {
            portal.canvasRegistry.updateElement(element);
          }
        }
      });

      currentGroup.destroy();
      portal.selection.setSelection(redoChildren);
      portal.selection.setFocusedNode(redoChildren.at(-1) ?? null);
      portal.crdt.applyOps({ ops: commitResult.redoOps });
      portal.render.staticForegroundLayer.batchDraw();
    },
  });

  void args;
}
