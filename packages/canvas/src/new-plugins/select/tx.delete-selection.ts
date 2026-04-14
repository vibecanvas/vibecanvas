import type { TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type { Group } from "konva/lib/Group";
import type { Node } from "konva/lib/Node";
import type { Shape, ShapeConfig } from "konva/lib/Shape";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { RenderOrderService } from "../../new-services/render-order/RenderOrderService";
import type { SceneService } from "../../new-services/scene/SceneService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import { fxGetCanvasNodeKind, fxIsCanvasGroupNode } from "../../core/fx.canvas-node-semantics";

export type TPortalDeleteSelection = {
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  render: SceneService;
  renderOrder: RenderOrderService;
  selection: SelectionService;
};

export type TArgsDeleteSelection = {
  recordHistory?: boolean;
  selection?: Array<Group | Shape<ShapeConfig>>;
};

type TSceneNode = Group | Shape<ShapeConfig>;

type TDeleteSnapshot = {
  rootIds: string[];
  groups: TGroup[];
  elements: TElement[];
  groupIds: string[];
  elementIds: string[];
};

type TCollectedDeleteData = {
  snapshot: TDeleteSnapshot;
  destroyNodes: TSceneNode[];
};

function isSceneNode(render: SceneService, node: Node | null | undefined): node is TSceneNode {
  return Boolean(node) && (node instanceof render.Group || node instanceof render.Shape);
}

function isSceneParent(render: SceneService, node: Node | null | undefined): node is Group | InstanceType<SceneService["Layer"]> {
  return Boolean(node) && (node instanceof render.Group || node instanceof render.Layer);
}

function isNodeDescendantOf(node: Node, ancestor: Node) {
  let current = node.getParent();

  while (current) {
    if (current === ancestor) {
      return true;
    }

    current = current.getParent();
  }

  return false;
}

function collapseSelectionToDeleteRoots(selection: TSceneNode[]) {
  return selection.filter((node, index) => {
    return !selection.some((candidate, candidateIndex) => {
      if (candidateIndex === index) {
        return false;
      }

      return isNodeDescendantOf(node, candidate);
    });
  });
}

function findSceneNodeById(render: SceneService, id: string | null) {
  if (!id) {
    return null;
  }

  const node = render.staticForegroundLayer.findOne((candidate: Node) => {
    return isSceneNode(render, candidate) && candidate.id() === id;
  });

  return isSceneNode(render, node) ? node : null;
}

function sortSceneTopDown(portal: TPortalDeleteSelection, parent: Group | InstanceType<SceneService["Layer"]>) {
  portal.renderOrder.sortChildren(parent);

  parent.getChildren().forEach((child) => {
    if (!fxIsCanvasGroupNode({}, { editor: portal.editor, node: child })) {
      return;
    }

    sortSceneTopDown(portal, child as Group);
  });
}

function collectDeleteSnapshot(portal: TPortalDeleteSelection, roots: TSceneNode[]): TCollectedDeleteData | null {
  const groups: TGroup[] = [];
  const elements: TElement[] = [];
  const groupIds = new Set<string>();
  const elementIds = new Set<string>();
  const visitedNodeIds = new Set<string>();
  const visitedNodes: TSceneNode[] = [];
  let didFail = false;

  const visitNode = (node: TSceneNode) => {
    if (didFail || visitedNodeIds.has(node.id())) {
      return;
    }

    visitedNodeIds.add(node.id());
    visitedNodes.push(node);

    const kind = fxGetCanvasNodeKind({}, { editor: portal.editor, node });
    if (kind === "group") {
      if (!fxIsCanvasGroupNode({}, { editor: portal.editor, node })) {
        didFail = true;
        return;
      }

      const group = portal.editor.toGroup(node);
      if (!group) {
        didFail = true;
        return;
      }

      if (!groupIds.has(node.id())) {
        groupIds.add(node.id());
        groups.push(group);
      }

      (node as Group).getChildren().forEach((child: Node) => {
        if (!isSceneNode(portal.render, child)) {
          return;
        }

        visitNode(child);
      });
      return;
    }

    if (kind === "element") {
      const element = portal.editor.toElement(node);
      if (!element) {
        didFail = true;
        return;
      }

      if (!elementIds.has(node.id())) {
        elementIds.add(node.id());
        elements.push(element);
      }
      return;
    }

    didFail = true;
  };

  roots.forEach((root) => {
    visitNode(root);
  });

  if (didFail) {
    return null;
  }

  return {
    snapshot: {
      rootIds: roots.map((root) => root.id()),
      groups,
      elements,
      groupIds: [...groupIds],
      elementIds: [...elementIds],
    },
    destroyNodes: visitedNodes.filter((node, index) => {
      return !visitedNodes.some((candidate, candidateIndex) => {
        if (candidateIndex === index) {
          return false;
        }

        if (!fxIsCanvasGroupNode({}, { editor: portal.editor, node: candidate })) {
          return false;
        }

        return isNodeDescendantOf(node, candidate);
      });
    }),
  };
}

function restoreDeleteSnapshot(portal: TPortalDeleteSelection, snapshot: TDeleteSnapshot) {
  const createdGroups = new Set<string>();
  const pendingGroups = [...snapshot.groups];
  let didCreateGroup = true;

  while (pendingGroups.length > 0 && didCreateGroup) {
    didCreateGroup = false;

    for (let index = 0; index < pendingGroups.length; index += 1) {
      const group = pendingGroups[index];
      if (!group) {
        continue;
      }

      const parentNode = group.parentGroupId
        ? findSceneNodeById(portal.render, group.parentGroupId)
        : portal.render.staticForegroundLayer;

      if (
        group.parentGroupId !== null
        && !createdGroups.has(group.parentGroupId)
        && !fxIsCanvasGroupNode({}, { editor: portal.editor, node: parentNode })
      ) {
        continue;
      }

      const parent = isSceneParent(portal.render, parentNode) ? parentNode : null;
      if (!parent) {
        continue;
      }

      const groupNode = portal.editor.createGroupFromTGroup(group);
      if (!groupNode) {
        continue;
      }

      parent.add(groupNode);
      createdGroups.add(group.id);
      pendingGroups.splice(index, 1);
      index -= 1;
      didCreateGroup = true;
    }
  }

  snapshot.elements.forEach((element) => {
    const parentNode = element.parentGroupId
      ? findSceneNodeById(portal.render, element.parentGroupId)
      : portal.render.staticForegroundLayer;
    const parent = isSceneParent(portal.render, parentNode) ? parentNode : null;
    if (!parent) {
      return;
    }

    const node = portal.editor.createShapeFromTElement(element);
    if (!node) {
      return;
    }

    parent.add(node);
  });

  portal.crdt.patch({ groups: snapshot.groups, elements: snapshot.elements });
  sortSceneTopDown(portal, portal.render.staticForegroundLayer);

  const restoredRoots = snapshot.rootIds
    .map((id) => findSceneNodeById(portal.render, id))
    .filter((node): node is TSceneNode => node !== null);

  portal.selection.setSelection(restoredRoots);
  portal.selection.setFocusedId(restoredRoots[restoredRoots.length - 1]?.id() ?? null);
  portal.render.stage.batchDraw();
}

function deleteSelectionInternal(portal: TPortalDeleteSelection, args: TArgsDeleteSelection) {
  const selection = (args.selection ?? portal.selection.selection)
    .filter((node): node is TSceneNode => isSceneNode(portal.render, node));
  const roots = collapseSelectionToDeleteRoots(selection);
  if (roots.length === 0) {
    return false;
  }

  const expandedRoots = collapseSelectionToDeleteRoots(roots.flatMap((root) => {
    return portal.renderOrder.getOrderBundle(root).filter((candidate): candidate is TSceneNode => {
      return isSceneNode(portal.render, candidate);
    });
  }));

  const collected = collectDeleteSnapshot(portal, expandedRoots);
  if (!collected) {
    return false;
  }

  const { snapshot, destroyNodes } = collected;
  destroyNodes.forEach((node) => {
    node.destroy();
  });

  portal.crdt.deleteById({
    elementIds: snapshot.elementIds,
    groupIds: snapshot.groupIds,
  });
  portal.selection.clear();
  portal.render.stage.batchDraw();

  if (args.recordHistory === false) {
    return true;
  }

  portal.history.record({
    label: "delete-selection",
    undo: () => {
      restoreDeleteSnapshot(portal, snapshot);
    },
    redo: () => {
      const redoRoots = snapshot.rootIds
        .map((id) => findSceneNodeById(portal.render, id))
        .filter((node): node is TSceneNode => node !== null);
      deleteSelectionInternal(portal, {
        recordHistory: false,
        selection: redoRoots,
      });
    },
  });

  return true;
}

export function txDeleteSelection(portal: TPortalDeleteSelection, args: TArgsDeleteSelection) {
  return deleteSelectionInternal(portal, args);
}
