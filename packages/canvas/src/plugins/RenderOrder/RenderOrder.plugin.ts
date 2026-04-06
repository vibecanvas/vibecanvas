import Konva from "konva";
import type { TElement, TGroup } from "@vibecanvas/automerge-service/types/canvas-doc";
import type { IPlugin, IPluginContext, TRenderOrderSnapshot } from "../shared/interface";
import { createOrderedZIndex, getNodeZIndex, setNodeZIndex } from "../shared/render-order.shared";

type TOrderedNode = Konva.Group | Konva.Shape;
type TParent = Konva.Layer | Konva.Group;

function isOrderedNode(node: Konva.Node): node is TOrderedNode {
  return node instanceof Konva.Group || node instanceof Konva.Shape;
}

function isParentContainer(node: Konva.Node | null | undefined): node is TParent {
  return node instanceof Konva.Layer || node instanceof Konva.Group;
}

function getImmediateOrderedChildren(parent: TParent) {
  return parent.getChildren().filter(isOrderedNode) as TOrderedNode[];
}

function sortNodesForBundle(nodes: TOrderedNode[], parent: TParent) {
  const children = getImmediateOrderedChildren(parent);
  const order = new Map(children.map((node, index) => [node.id(), index]));
  return [...nodes].sort((a, b) => (order.get(a.id()) ?? 0) - (order.get(b.id()) ?? 0));
}

export class RenderOrderPlugin implements IPlugin {
  apply(context: IPluginContext): void {
    context.capabilities.renderOrder = {
      getNodeZIndex,
      setNodeZIndex,
      getOrderBundle: (node) => {
        const parent = node.getParent();
        const bundle = context.capabilities.getReorderBundle?.(node) ?? [node];
        if (!isParentContainer(parent)) return [node];
        return sortNodesForBundle(bundle.filter((candidate) => candidate.getParent() === parent), parent);
      },
      getOrderedSiblings: (parent) => {
        const children = getImmediateOrderedChildren(parent);
        return [...children].sort((a, b) => {
          const zCompare = getNodeZIndex(a).localeCompare(getNodeZIndex(b));
          if (zCompare !== 0) return zCompare;
          return a.id().localeCompare(b.id());
        });
      },
      sortChildren: (parent) => {
        const sorted = context.capabilities.renderOrder!.getOrderedSiblings(parent);
        sorted.forEach((node, index) => node.zIndex(index));
        context.capabilities.hostedWidgets?.syncDomOrder();
      },
      assignOrderOnInsert: ({ parent, nodes, position = "front" }) => {
        const orderedNodes = sortNodesForBundle(nodes.filter((node) => node.getParent() === parent), parent);
        if (orderedNodes.length === 0) return [];
        const children = getImmediateOrderedChildren(parent);
        const movingIds = new Set(orderedNodes.map((node) => node.id()));
        const stationary = children.filter((child) => !movingIds.has(child.id()));
        const nextChildren = this.insertNodes(stationary, orderedNodes, position);
        return this.applyOrderedChildren(context, parent, nextChildren, true);
      },
      moveSelectionUp: (nodes) => {
        this.moveByOneStep(context, nodes, "forward");
      },
      moveSelectionDown: (nodes) => {
        this.moveByOneStep(context, nodes, "backward");
      },
      bringSelectionToFront: (nodes) => {
        this.moveToExtreme(context, nodes, "front");
      },
      sendSelectionToBack: (nodes) => {
        this.moveToExtreme(context, nodes, "back");
      },
      snapshotParentOrder: (parent) => ({
        parentId: parent.id() || "__layer__",
        items: getImmediateOrderedChildren(parent).map((node) => ({
          id: node.id(),
          zIndex: getNodeZIndex(node),
          kind: node instanceof Konva.Group ? "group" : "element",
        })),
      }),
      restoreParentOrder: (snapshot) => {
        const parent = this.findParentBySnapshot(context, snapshot);
        if (!parent) return;
        snapshot.items.forEach((item) => {
          const node = this.findImmediateChildById(parent, item.id);
          if (!node) return;
          setNodeZIndex(node, item.zIndex);
        });
        context.capabilities.renderOrder?.sortChildren(parent);
      },
    };
  }

  private moveByOneStep(context: IPluginContext, roots: TOrderedNode[], direction: "forward" | "backward") {
    const resolved = this.resolveOrderedUnits(context, roots);
    if (!resolved) return;

    const units = [...resolved.units];
    if (direction === "forward") {
      for (let index = units.length - 2; index >= 0; index -= 1) {
        if (!units[index].selected && units[index + 1].selected) {
          [units[index], units[index + 1]] = [units[index + 1], units[index]];
        }
      }
    } else {
      for (let index = 1; index < units.length; index += 1) {
        if (units[index].selected && !units[index - 1].selected) {
          [units[index], units[index - 1]] = [units[index - 1], units[index]];
        }
      }
    }

    this.applyUnitOrder(context, resolved.parent, units);
  }

  private moveToExtreme(context: IPluginContext, roots: TOrderedNode[], position: "front" | "back") {
    const resolved = this.resolveOrderedUnits(context, roots);
    if (!resolved) return;

    const selected = resolved.units.filter((unit) => unit.selected);
    const unselected = resolved.units.filter((unit) => !unit.selected);
    const next = position === "front"
      ? [...unselected, ...selected]
      : [...selected, ...unselected];

    this.applyUnitOrder(context, resolved.parent, next);
  }

  private resolveOrderedUnits(context: IPluginContext, roots: TOrderedNode[]) {
    const uniqueRoots = roots.filter((node, index) => roots.findIndex((candidate) => candidate.id() === node.id()) === index);
    if (uniqueRoots.length === 0) return null;

    const parent = uniqueRoots[0]?.getParent();
    if (!isParentContainer(parent)) return null;
    if (!uniqueRoots.every((node) => node.getParent() === parent)) return null;

    const selectedIds = new Set<string>();
    uniqueRoots.forEach((root) => {
      const bundle = context.capabilities.renderOrder?.getOrderBundle(root) ?? [root];
      bundle.forEach((node) => selectedIds.add(node.id()));
    });

    const orderedChildren = getImmediateOrderedChildren(parent);
    const units: Array<{ nodes: TOrderedNode[]; selected: boolean }> = [];
    const consumedIds = new Set<string>();

    orderedChildren.forEach((child) => {
      if (consumedIds.has(child.id())) return;
      const bundle = context.capabilities.renderOrder?.getOrderBundle(child) ?? [child];
      const nodes = sortNodesForBundle(bundle.filter((node) => node.getParent() === parent), parent);
      nodes.forEach((node) => consumedIds.add(node.id()));
      units.push({
        nodes,
        selected: nodes.some((node) => selectedIds.has(node.id())),
      });
    });

    return { parent, units };
  }

  private applyUnitOrder(context: IPluginContext, parent: TParent, units: Array<{ nodes: TOrderedNode[] }>) {
    const orderedChildren = units.flatMap((unit) => unit.nodes);
    const before = context.capabilities.renderOrder?.snapshotParentOrder(parent);
    const patches = this.applyOrderedChildren(context, parent, orderedChildren, true);
    const after = context.capabilities.renderOrder?.snapshotParentOrder(parent);
    if (!before || !after || patches.length === 0) return;

    context.history.record({
      label: "render-order",
      undo: () => {
        this.applySnapshot(context, parent, before);
      },
      redo: () => {
        this.applySnapshot(context, parent, after);
      },
    });
  }

  private applySnapshot(context: IPluginContext, parent: TParent, snapshot: TRenderOrderSnapshot) {
    snapshot.items.forEach((item) => {
      const node = this.findImmediateChildById(parent, item.id);
      if (!node) return;
      setNodeZIndex(node, item.zIndex);
    });
    const orderedChildren = [...snapshot.items]
      .map((item) => this.findImmediateChildById(parent, item.id))
      .filter((node): node is TOrderedNode => Boolean(node));
    this.applyOrderedChildren(context, parent, orderedChildren, true);
  }

  private applyOrderedChildren(context: IPluginContext, parent: TParent, orderedChildren: TOrderedNode[], persist: boolean) {
    orderedChildren.forEach((node, index) => {
      node.zIndex(index);
      setNodeZIndex(node, createOrderedZIndex(index));
    });

    if (!persist) return [];

    const elementPatches: TElement[] = [];
    const groupPatches: TGroup[] = [];

    orderedChildren.forEach((node, index) => {
      if (node instanceof Konva.Group) {
        groupPatches.push({
          id: node.id(),
          zIndex: createOrderedZIndex(index),
        } as TGroup);
        return;
      }

      elementPatches.push({
        id: node.id(),
        zIndex: createOrderedZIndex(index),
      } as TElement);
    });

    if (elementPatches.length > 0 || groupPatches.length > 0) {
      context.crdt.patch({ elements: elementPatches, groups: groupPatches });
    }

    context.capabilities.hostedWidgets?.syncDomOrder();

    return [...elementPatches, ...groupPatches];
  }

  private findImmediateChildById(parent: TParent, id: string) {
    return getImmediateOrderedChildren(parent).find((node) => node.id() === id) ?? null;
  }

  private findParentBySnapshot(context: IPluginContext, snapshot: TRenderOrderSnapshot) {
    if (snapshot.parentId === "__layer__") return context.staticForegroundLayer;
    const parent = context.staticForegroundLayer.findOne(`#${snapshot.parentId}`);
    return isParentContainer(parent) ? parent : null;
  }

  private insertNodes(
    stationary: TOrderedNode[],
    moving: TOrderedNode[],
    position: "front" | "back" | { beforeId?: string; afterId?: string },
  ) {
    if (position === "back") {
      return [...moving, ...stationary];
    }

    if (position === "front") {
      return [...stationary, ...moving];
    }

    if (position.afterId) {
      const anchorIndex = stationary.findIndex((node) => node.id() === position.afterId);
      if (anchorIndex >= 0) {
        return [
          ...stationary.slice(0, anchorIndex + 1),
          ...moving,
          ...stationary.slice(anchorIndex + 1),
        ];
      }
    }

    if (position.beforeId) {
      const anchorIndex = stationary.findIndex((node) => node.id() === position.beforeId);
      if (anchorIndex >= 0) {
        return [
          ...stationary.slice(0, anchorIndex),
          ...moving,
          ...stationary.slice(anchorIndex),
        ];
      }
    }

    return [...stationary, ...moving];
  }
}
