import Konva from "konva";
import type { KonvaEventObject, Node } from "konva/lib/Node";
import type { Shape, ShapeConfig } from "konva/lib/Shape";
import { CustomEvents } from "../custom-events";
import { CanvasMode } from "../services/canvas/enum";
import type { IPlugin, IPluginContext } from "./interface";
import type { Group } from "konva/lib/Group";
import type { TElement, TGroup } from "@vibecanvas/shell/automerge/index";
import { GroupPlugin } from "./Group.plugin";
import { ImagePlugin } from "./Image.plugin";
import { Shape2dPlugin } from "./Shape2d.plugin";

function getSelectionLayerPointerPosition(context: IPluginContext) {
  const pointer = context.dynamicLayer.getRelativePointerPosition();
  if (!pointer) return null;

  return pointer;
}

function hasSameSelectionOrder(
  currentSelection: Array<{ id(): string }>,
  nextSelection: Array<{ id(): string }>,
) {
  if (currentSelection.length != nextSelection.length) return false;

  return currentSelection.every((node, index) => node.id() === nextSelection[index]?.id());
}

/**
 * Walks konva node tree to get path traced from the node to the static foreground layer
 * 
 * @param context 
 * @param node 
 * @returns 
 */
function getSelectionPath(
  context: IPluginContext,
  node: Konva.Group | Konva.Shape,
): Array<Konva.Group | Konva.Shape> {
  const path: Array<Konva.Group | Konva.Shape> = [];
  let current: Konva.Node | null = node;

  while (current && current !== context.staticForegroundLayer) {
    if (current instanceof Konva.Group || current instanceof Konva.Shape) {
      path.push(current);
    }

    current = current.parent;
  }

  return path.reverse();
}

/**
 * Checks if the current selection is a prefix of the given path
 * 
 * @param currentSelection 
 * @param path 
 * @returns 
 */
function isSelectionPathPrefix(
  currentSelection: Array<Konva.Group | Konva.Shape>,
  path: Array<Konva.Group | Konva.Shape>,
) {
  if (currentSelection.length > path.length) return false;

  return currentSelection.every((node, index) => node === path[index]);
}

function isEditableTarget(target: EventTarget | null) {
  if (target instanceof HTMLInputElement) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLElement && target.isContentEditable) return true;

  return false;
}

function isNodeDescendantOf(node: Konva.Node, ancestor: Konva.Node) {
  let current = node.getParent();

  while (current) {
    if (current === ancestor) return true;
    current = current.getParent();
  }

  return false;
}

function collapseSelectionToDeleteRoots(selection: Array<Konva.Group | Konva.Shape>) {
  return selection.filter((node, index) => {
    return !selection.some((candidate, candidateIndex) => {
      if (candidateIndex === index) return false;
      return isNodeDescendantOf(node, candidate);
    });
  });
}

type TDeleteSnapshot = {
  rootIds: string[];
  groups: TGroup[];
  elements: TElement[];
  groupIds: string[];
  elementIds: string[];
};

type TCollectedDeleteData = {
  snapshot: TDeleteSnapshot;
  destroyNodes: Array<Konva.Group | Konva.Shape>;
};

function collectDeleteSnapshot(
  context: IPluginContext,
  roots: Array<Konva.Group | Konva.Shape>,
): TCollectedDeleteData {
  const groups: TGroup[] = [];
  const elements: TElement[] = [];
  const groupIds = new Set<string>();
  const elementIds = new Set<string>();
  const visitedNodeIds = new Set<string>();
  const visitedNodes: Array<Konva.Group | Konva.Shape> = [];

  const visitNode = (node: Konva.Group | Konva.Shape) => {
    if (visitedNodeIds.has(node.id())) return;
    visitedNodeIds.add(node.id());
    visitedNodes.push(node);

    if (node instanceof Konva.Group) {
      if (!groupIds.has(node.id())) {
        groupIds.add(node.id());
        groups.push(context.capabilities.toGroup?.(node) ?? GroupPlugin.toTGroup(node));
      }

      node.getChildren().forEach((child) => {
        if (child instanceof Konva.Group || child instanceof Konva.Shape) {
          visitNode(child);
        }
      });

      return;
    }

    if (!elementIds.has(node.id())) {
      const element = context.capabilities.toElement?.(node) ?? Shape2dPlugin.toTElement(node);
      elementIds.add(node.id());
      elements.push(element);
    }

    if (!(node instanceof Konva.Rect)) return;

    const attachedText = context.staticForegroundLayer.findOne((candidate: Konva.Node) => {
      return candidate instanceof Konva.Text && candidate.getAttr("vcContainerId") === node.id();
    });

    if (!(attachedText instanceof Konva.Text)) return;
    visitNode(attachedText);
  };

  roots.forEach((root) => visitNode(root));

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
        if (candidateIndex === index) return false;
        if (!(candidate instanceof Konva.Group)) return false;

        return isNodeDescendantOf(node, candidate);
      });
    }),
  };
}

function restoreDeleteSnapshot(context: IPluginContext, snapshot: TDeleteSnapshot) {
  ImagePlugin.retainFilesForElements(context, snapshot.elements);

  const createdGroups = new Set<string>();
  const pendingGroups = [...snapshot.groups];
  let didCreateGroup = true;

  while (pendingGroups.length > 0 && didCreateGroup) {
    didCreateGroup = false;

    for (let index = 0; index < pendingGroups.length; index += 1) {
      const group = pendingGroups[index];
      if (!group) continue;

      const parentNode = group.parentGroupId
        ? context.staticForegroundLayer.findOne(`#${group.parentGroupId}`)
        : context.staticForegroundLayer;

      if (
        group.parentGroupId !== null &&
        !createdGroups.has(group.parentGroupId) &&
        !(parentNode instanceof Konva.Group)
      ) {
        continue;
      }

      const groupNode = context.capabilities.createGroupFromTGroup?.(group)
        ?? new Konva.Group({ id: group.id, draggable: true });
      const parent = parentNode instanceof Konva.Group || parentNode instanceof Konva.Layer
        ? parentNode
        : null;

      if (parent === null) {
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
    const node = context.capabilities.createShapeFromTElement?.(element);
    if (!node) return;

    const parentNode = element.parentGroupId
      ? context.staticForegroundLayer.findOne(`#${element.parentGroupId}`)
      : context.staticForegroundLayer;
    const parent = parentNode instanceof Konva.Group || parentNode instanceof Konva.Layer
      ? parentNode
      : null;

    if (parent === null) return;

    parent.add(node);
  });

  context.crdt.patch({ groups: snapshot.groups, elements: snapshot.elements });

  const restoredRoots = snapshot.rootIds
    .map((id) => context.staticForegroundLayer.findOne((node: Konva.Node) => {
      return (node instanceof Konva.Group || node instanceof Konva.Shape) && node.id() === id;
    }))
    .filter((node): node is Konva.Group | Konva.Shape => node instanceof Konva.Group || node instanceof Konva.Shape);

  context.setState("selection", restoredRoots);
}

function executeDeleteSelection(
  context: IPluginContext,
  selection: Array<Konva.Group | Konva.Shape>,
  args?: { recordHistory?: boolean },
) {
  const roots = collapseSelectionToDeleteRoots(selection);
  if (roots.length === 0) return false;

  const { snapshot, destroyNodes } = collectDeleteSnapshot(context, roots);

  ImagePlugin.releaseFilesForElements(context, snapshot.elements);

  destroyNodes.forEach((node) => {
    node.destroy();
  });

  context.crdt.deleteById({
    elementIds: snapshot.elementIds,
    groupIds: snapshot.groupIds,
  });
  context.setState("selection", []);

  if (args?.recordHistory !== false) {
    context.history.record({
      label: "delete-selection",
      undo: () => {
        restoreDeleteSnapshot(context, snapshot);
      },
      redo: () => {
        const redoRoots = snapshot.rootIds
          .map((id) => context.staticForegroundLayer.findOne((node: Konva.Node) => {
            return (node instanceof Konva.Group || node instanceof Konva.Shape) && node.id() === id;
          }))
          .filter((node): node is Konva.Group | Konva.Shape => node instanceof Konva.Group || node instanceof Konva.Shape);

        executeDeleteSelection(context, redoRoots, { recordHistory: false });
      },
    });
  }

  return true;
}

export class SelectPlugin implements IPlugin {
  #selectionRectangle: Konva.Rect;

  constructor() {
    this.#selectionRectangle = new Konva.Rect({
      visible: false,
      fill: "rgba(59, 130, 246, 0.12)",
      stroke: "#3b82f6",
      strokeWidth: 1,
      dash: [6, 4],
      listening: false,
    });
  }

  apply(context: IPluginContext): void {
    context.hooks.init.tap(() => {
      context.dynamicLayer.add(this.#selectionRectangle);
    })

    context.hooks.customEvent.tap((event, payload) => {
      if (context.state.mode !== CanvasMode.SELECT) return false;
      switch (event) {
        case CustomEvents.ELEMENT_POINTERDOWN: return SelectPlugin.handleElementPointerDown(context, payload); break;
        case CustomEvents.ELEMENT_POINTERDBLCLICK: return SelectPlugin.handleElementDoubleClick(context, payload); break;
      }

      return false;
    });

    context.hooks.pointerDown.tap((e) => {
      if (context.state.mode !== CanvasMode.SELECT) return;
      this.handlePointerDown(context, e)
    });

    context.hooks.pointerMove.tap((e) => {
      if (context.state.mode !== CanvasMode.SELECT || !this.#selectionRectangle.visible()) return;
      this.handlePointerMove(context, e)
    });

    context.hooks.pointerUp.tap(() => {
      if (context.state.mode !== CanvasMode.SELECT) return;
      this.#selectionRectangle.visible(false);
    });

    context.hooks.keydown.tap((event) => {
      if (context.state.mode !== CanvasMode.SELECT) return;
      if (context.state.selection.length === 0) return;
      if (event.key !== "Backspace" && event.key !== "Delete") return;
      if (isEditableTarget(event.target)) return;

      event.preventDefault();
      event.stopPropagation();
      executeDeleteSelection(context, context.state.selection);
    });

  }

  private static handleElementPointerDown(context: IPluginContext, payload: KonvaEventObject<PointerEvent, Shape<ShapeConfig> | Group>) {
    const path = getSelectionPath(context, payload.currentTarget);
    const nextDepth = Math.min(Math.max(context.state.selection.length, 1), path.length);
    const nextSelection = path.slice(0, nextDepth);

    // Case 1: shift-click toggles the item on the currently focused depth.
    // This extends multi-selection without drilling deeper, and clicking an
    // already selected same-level item removes it from the selection.
    if (payload.evt.shiftKey) {
      const focusedLevelNode = nextSelection[nextSelection.length - 1];
      if (focusedLevelNode) {
        if (context.state.selection.includes(focusedLevelNode)) {
          context.setState('selection', context.state.selection.filter(node => node !== focusedLevelNode))
        } else {
          context.setState('selection', [...context.state.selection, focusedLevelNode])
        }
      }
      return true
    }

    // Case 2a: flat multi-selection is active and the clicked top-level node is
    // already in the selection — preserve it so drag applies to all selected nodes.
    // Only applies to flat multi-select (no node is nested inside another group in
    // the current selection). Depth/drill selections (e.g. [outerGroup, innerGroup, shape])
    // must still allow normal focus switching.
    const topLevelNode = path[0];
    const isFlatMultiSelect =
      context.state.selection.length > 1 &&
      !context.state.selection.some(n => n.parent instanceof Konva.Group);
    if (isFlatMultiSelect && topLevelNode && context.state.selection.includes(topLevelNode)) {
      return true;
    }

    // Case 2: regular click changes focus only inside the current depth.
    // Single click should never drill deeper into nested groups.
    if (!hasSameSelectionOrder(context.state.selection, nextSelection)) {
      context.setState('selection', nextSelection)
    }

    // Case 3: clicking the already focused item leaves selection unchanged.
    return true
  }

  private static handleElementDoubleClick(context: IPluginContext, payload: KonvaEventObject<PointerEvent, Shape<ShapeConfig> | Group>): boolean {
    const path = getSelectionPath(context, payload.currentTarget);

    if (isSelectionPathPrefix(context.state.selection, path) && context.state.selection.length < path.length) {
      context.setState('selection', path.slice(0, context.state.selection.length + 1))
      return true
    }

    return false
  }

  private handlePointerDown(context: IPluginContext, payload: KonvaEventObject<PointerEvent, Node>) {
    const pointer = getSelectionLayerPointerPosition(context);
    if (!pointer) return;
    if (payload.target !== context.stage) return;

    this.#selectionRectangle.visible(true);
    this.#selectionRectangle.position(pointer);
    this.#selectionRectangle.size({ width: 0, height: 0 });
    this.#selectionRectangle.moveToTop();

    context.setState('selection', []);
  }

  private handlePointerMove(context: IPluginContext, payload: KonvaEventObject<MouseEvent, Node>) {
    const pointer = getSelectionLayerPointerPosition(context);
    if (!pointer) return;

    this.#selectionRectangle.size({
      width: pointer.x - this.#selectionRectangle.x(),
      height: pointer.y - this.#selectionRectangle.y(),
    });

    const topNodes = context.staticForegroundLayer.getChildren(item => item.parent?.id === context.staticForegroundLayer.id)
    const inSelection = topNodes.filter(node => {
      if (!node.isListening()) return false;
      return Konva.Util.haveIntersection(node.getClientRect(), this.#selectionRectangle.getClientRect());
    }).sort((a, b) => a.id().localeCompare(b.id()))

    if (!hasSameSelectionOrder(context.state.selection, inSelection)) {
      context.setState('selection', inSelection);
    }
  }

}
