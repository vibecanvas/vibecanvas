import type { TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { CanvasRegistryService } from "../../services/canvas-registry/CanvasRegistryService";
import type { CrdtService } from "../../services/crdt/CrdtService";
import type { HistoryService } from "../../services/history/HistoryService";
import type { SceneService } from "../../services/scene/SceneService";
import type { SelectionService } from "../../services/selection/SelectionService";
import { fxGetCanvasNodeKind, fxIsCanvasGroupNode } from "../../core/fx.canvas-node-semantics";
import { fxGetSelectionBounds } from "./fn.get-selection-bounds";
import { fxFindSceneNodeById, fxGetGroupChildren, fxGetSelectionGroupParent, fxIsSceneParent, fxIsSceneNode, type TSceneNode } from "./fn.scene-node";
import { fxToGroupPatch } from "./fn.to-group-patch";

export type TPortalGroupSelection = {
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
    return fxIsSceneNode({ Group: portal.Group, Shape: portal.Shape, render: portal.render, node });
  });
  if (selection.length <= 1) {
    return;
  }

  const parent = fxGetSelectionGroupParent({ Group: portal.Group, Layer: portal.Layer, render: portal.render, selection });
  if (!parent) {
    return;
  }

  const bounds = fxGetSelectionBounds({ selection });
  const createdAt = portal.now();
  const groupId = portal.createId();
  const zIndex = portal.getNodeZIndex(selection[selection.length - 1] ?? selection[0]);
  const groupNode = portal.setupNode(portal.createGroupNode({
    id: groupId,
    parentGroupId: fxIsCanvasGroupNode({}, { editor: portal.canvasRegistry, node: parent }) ? parent.id() : null,
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
    canvasRegistry: portal.canvasRegistry,
    group: groupNode,
    getNodeZIndex: portal.getNodeZIndex,
    fallbackCreatedAt: createdAt,
  })];

  selection.forEach((node) => {
    const absolutePosition = node.getAbsolutePosition();
    groupNode.add(node);
    node.setAbsolutePosition(absolutePosition);

    const kind = fxGetCanvasNodeKind({}, { editor: portal.canvasRegistry, node });
    if (kind === "group") {
      const groupPatch = portal.canvasRegistry.toGroup(node);
      if (groupPatch) {
        groupPatches.push(groupPatch);
      }
      return;
    }

    if (kind !== null) {
      const element = portal.canvasRegistry.toElement(node);
      if (element) {
        elementPatches.push(element);
      }
    }
  });

  portal.sortChildrenByPersistedOrder(groupNode);
  const commitResult = (() => {
    const builder = portal.crdt.build();
    elementPatches.forEach((element) => {
      builder.patchElement(element.id, element);
    });
    groupPatches.forEach((group) => {
      builder.patchGroup(group.id, group);
    });
    return builder.commit();
  })();
  portal.selection.setSelection([groupNode]);
  portal.selection.setFocusedNode(groupNode);
  portal.render.staticForegroundLayer.batchDraw();

  const childIds = selection.map((node) => node.id());

  portal.history.record({
    label: "group",
    undo() {
      const currentGroupNode = fxFindSceneNodeById({ Group: portal.Group, Shape: portal.Shape, render: portal.render, id: groupId });
      if (!fxIsCanvasGroupNode({}, { editor: portal.canvasRegistry, node: currentGroupNode })) {
        return;
      }

      const currentGroup = currentGroupNode as Konva.Group;
      const children = fxGetGroupChildren({ Group: portal.Group, Shape: portal.Shape, group: currentGroup, render: portal.render });
      const currentParentNode = currentGroup.getParent();
      if (!fxIsSceneParent({ Group: portal.Group, Layer: portal.Layer, render: portal.render, node: currentParentNode })) {
        return;
      }

      const currentParent = currentParentNode as Konva.Group | Konva.Layer;

      children.forEach((child) => {
        const absolutePosition = child.getAbsolutePosition();
        currentParent.add(child);
        child.setAbsolutePosition(absolutePosition);

        const kind = fxGetCanvasNodeKind({}, { editor: portal.canvasRegistry, node: child });
        if (kind === "group") {
          return;
        }

        if (kind !== null) {
          portal.canvasRegistry.toElement(child);
        }
      });

      currentGroup.destroy();
      portal.selection.setSelection(children);
      portal.selection.setFocusedNode(children.at(-1) ?? null);
      commitResult.rollback();
      portal.render.staticForegroundLayer.batchDraw();
    },
    redo() {
      const nodes = childIds
        .map((id) => fxFindSceneNodeById({ Group: portal.Group, Shape: portal.Shape, render: portal.render, id }))
        .filter((node): node is TSceneNode => node !== null);

      if (nodes.length !== childIds.length) {
        return;
      }

      const redoParent = fxGetSelectionGroupParent({ Group: portal.Group, Layer: portal.Layer, render: portal.render, selection: nodes });
      if (!redoParent) {
        return;
      }

      const recreated = portal.setupNode(portal.createGroupNode({
        id: groupId,
        parentGroupId: fxIsCanvasGroupNode({}, { editor: portal.canvasRegistry, node: redoParent }) ? redoParent.id() : null,
        zIndex,
        locked: false,
        createdAt,
      }));
      const redoBounds = fxGetSelectionBounds({ selection: nodes });
      recreated.position({ x: redoBounds.x, y: redoBounds.y });
      recreated.setAttr("width", redoBounds.width);
      recreated.setAttr("height", redoBounds.height);
      redoParent.add(recreated);

      fxToGroupPatch({
        canvasRegistry: portal.canvasRegistry,
        group: recreated,
        getNodeZIndex: portal.getNodeZIndex,
        fallbackCreatedAt: createdAt,
      });

      nodes.forEach((node) => {
        const absolutePosition = node.getAbsolutePosition();
        recreated.add(node);
        node.setAbsolutePosition(absolutePosition);

        const kind = fxGetCanvasNodeKind({}, { editor: portal.canvasRegistry, node });
        if (kind === "group") {
          return;
        }

        if (kind !== null) {
          portal.canvasRegistry.toElement(node);
        }
      });

      portal.sortChildrenByPersistedOrder(recreated);
      portal.selection.setSelection([recreated]);
      portal.selection.setFocusedNode(recreated);
      portal.crdt.applyOps({ ops: commitResult.redoOps });
      portal.render.staticForegroundLayer.batchDraw();
    },
  });

  void args;
}
