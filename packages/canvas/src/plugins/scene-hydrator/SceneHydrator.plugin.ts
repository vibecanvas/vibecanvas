import type { IPlugin } from "@vibecanvas/runtime";
import type { TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import Konva from "konva";
import { isKonvaGroup, isKonvaShape, isKonvaText } from "../../core/GUARDS";
import { fxIsCanvasGroupNode } from "../../core/fx.canvas-node-semantics";
import type { CanvasRegistryService } from "../../services/canvas-registry/CanvasRegistryService";
import type { CrdtService } from "../../services/crdt/CrdtService";
import type { EditorService } from "../../services/editor/EditorService";
import type { SceneService } from "../../services/scene/SceneService";
import type { SelectionService } from "../../services/selection/SelectionService";
import type { IRuntimeHooks } from "../../runtime";

const ATTACHED_TEXT_NAME = "attached-text";

type TSceneNode = Konva.Group | Konva.Shape;
type TSceneStateSnapshot = {
  selectionIds: string[];
  focusedId: string | null;
  editingTextId: string | null;
  editingShape1dId: string | null;
};

type TCanvasSemantics = {
  toElement(node: Konva.Node): TElement | null;
  toGroup(node: Konva.Node): TGroup | null;
};

function createCanvasSemantics(canvasRegistry: CanvasRegistryService): TCanvasSemantics {
  return {
    toElement: (node) => canvasRegistry.toElement(node),
    toGroup: (node) => canvasRegistry.toGroup(node),
  };
}

function compareByPersistedOrder(left: { id: string; zIndex?: string }, right: { id: string; zIndex?: string }) {
  const zCompare = (left.zIndex ?? "").localeCompare(right.zIndex ?? "");
  if (zCompare !== 0) {
    return zCompare;
  }

  return left.id.localeCompare(right.id);
}

function captureSceneState(selection: SelectionService, editor: EditorService): TSceneStateSnapshot {
  return {
    selectionIds: selection.selection.map((node) => node.id()),
    focusedId: selection.focusedId,
    editingTextId: editor.editingTextId,
    editingShape1dId: editor.editingShape1dId,
  };
}

function findSceneNodeById(scene: SceneService, id: string | null): TSceneNode | null {
  if (!id) {
    return null;
  }

  const node = scene.staticForegroundLayer.findOne((candidate: Konva.Node) => {
    return (isKonvaGroup(candidate) || isKonvaShape(candidate)) && candidate.id() === id;
  });

  if (!isKonvaGroup(node) && !isKonvaShape(node)) {
    return null;
  }

  return node;
}

function restoreSceneState(scene: SceneService, selection: SelectionService, editor: EditorService, snapshot: TSceneStateSnapshot) {
  const nextSelection = snapshot.selectionIds
    .map((id) => findSceneNodeById(scene, id))
    .filter((node): node is TSceneNode => node !== null);

  selection.setSelection(nextSelection);
  selection.setFocusedId(findSceneNodeById(scene, snapshot.focusedId)?.id() ?? null);
  editor.setEditingTextId(findSceneNodeById(scene, snapshot.editingTextId)?.id() ?? null);
  editor.setEditingShape1dId(findSceneNodeById(scene, snapshot.editingShape1dId)?.id() ?? null);
}

function loadGroupsTopDown(args: {
  groups: TGroup[];
  canvasRegistry: CanvasRegistryService;
  scene: SceneService;
}) {
  const groupsById = new Map(args.groups.map((group) => [group.id, group]));
  const remainingGroupIds = new Set(args.groups.map((group) => group.id));
  const mountedGroups = new Map<string, Konva.Group>();

  while (remainingGroupIds.size > 0) {
    let loadedInPass = false;

    for (const groupId of [...remainingGroupIds]) {
      const group = groupsById.get(groupId);
      if (!group) {
        remainingGroupIds.delete(groupId);
        continue;
      }

      const parent = group.parentGroupId
        ? mountedGroups.get(group.parentGroupId)
        : args.scene.staticForegroundLayer;
      if (!parent) {
        continue;
      }

      const groupNode = args.canvasRegistry.createNodeFromGroup(group);
      remainingGroupIds.delete(groupId);
      if (!groupNode) {
        continue;
      }

      parent.add(groupNode);
      mountedGroups.set(groupId, groupNode);
      loadedInPass = true;
    }

    if (!loadedInPass) {
      break;
    }
  }
}

function loadElementsTopDown(args: {
  elements: TElement[];
  canvasRegistry: CanvasRegistryService;
  scene: SceneService;
}) {
  const semantics = createCanvasSemantics(args.canvasRegistry);
  const groupsById = new Map(
    args.scene.staticForegroundLayer.find((candidate: Konva.Node) => {
      return fxIsCanvasGroupNode({}, { editor: semantics, node: candidate });
    }).map((candidate) => [candidate.id(), candidate as Konva.Group]),
  );
  const invalidElementIds: string[] = [];

  args.elements.forEach((element) => {
    const parent = element.parentGroupId
      ? groupsById.get(element.parentGroupId)
      : args.scene.staticForegroundLayer;
    if (!parent) {
      return;
    }

    if (!element.data) {
      invalidElementIds.push(element.id);
      return;
    }

    const node = args.canvasRegistry.createNodeFromElement(element);
    if (!node) {
      return;
    }

    parent.add(node);
  });

  return invalidElementIds;
}

function sortSceneTopDown(scene: SceneService, canvasRegistry: CanvasRegistryService, parent: Konva.Layer | Konva.Group) {
  const semantics = createCanvasSemantics(canvasRegistry);

  parent.getChildren()
    .filter((candidate): candidate is TSceneNode => isKonvaGroup(candidate) || isKonvaShape(candidate))
    .slice()
    .sort((left, right) => {
      return compareByPersistedOrder(
        { id: left.id(), zIndex: left.getAttr("vcZIndex") as string | undefined },
        { id: right.id(), zIndex: right.getAttr("vcZIndex") as string | undefined },
      );
    })
    .forEach((child, index) => {
      child.zIndex(index);
      if (fxIsCanvasGroupNode({}, { editor: semantics, node: child })) {
        sortSceneTopDown(scene, canvasRegistry, child as Konva.Group);
      }
    });
}

function isAttachedTextNode(node: Konva.Node): node is Konva.Text {
  return isKonvaText(node)
    && node.name() === ATTACHED_TEXT_NAME
    && typeof node.getAttr("vcContainerId") === "string";
}

function keepAttachedTextAboveHosts(scene: SceneService, canvasRegistry: CanvasRegistryService, parent: Konva.Layer | Konva.Group) {
  void scene;

  const semantics = createCanvasSemantics(canvasRegistry);
  const orderedChildren = parent.getChildren()
    .filter((candidate): candidate is TSceneNode => isKonvaGroup(candidate) || isKonvaShape(candidate));
  const attachedTextByHostId = new Map<string, Konva.Text[]>();
  const detached: TSceneNode[] = [];

  orderedChildren.forEach((child) => {
    if (fxIsCanvasGroupNode({}, { editor: semantics, node: child })) {
      keepAttachedTextAboveHosts(scene, canvasRegistry, child as Konva.Group);
      detached.push(child);
      return;
    }

    if (!isAttachedTextNode(child)) {
      detached.push(child);
      return;
    }

    const hostId = child.getAttr("vcContainerId") as string;
    const bucket = attachedTextByHostId.get(hostId) ?? [];
    bucket.push(child);
    attachedTextByHostId.set(hostId, bucket);
  });

  const nextChildren: TSceneNode[] = [];
  detached.forEach((child) => {
    nextChildren.push(child);
    if (fxIsCanvasGroupNode({}, { editor: semantics, node: child })) {
      return;
    }

    const attachedTexts = attachedTextByHostId.get(child.id()) ?? [];
    nextChildren.push(...attachedTexts);
    attachedTextByHostId.delete(child.id());
  });

  for (const orphanTexts of attachedTextByHostId.values()) {
    nextChildren.push(...orphanTexts);
  }

  nextChildren.forEach((child, index) => {
    child.zIndex(index);
  });
}

function loadCanvas(crdt: CrdtService, canvasRegistry: CanvasRegistryService, scene: SceneService) {
  const doc = crdt.doc();
  const groups = Object.values(doc.groups).sort(compareByPersistedOrder);
  const elements = Object.values(doc.elements).sort(compareByPersistedOrder);

  loadGroupsTopDown({ groups, canvasRegistry, scene });
  const invalidElementIds = loadElementsTopDown({ elements, canvasRegistry, scene });
  if (invalidElementIds.length > 0) {
    const builder = crdt.build();
    invalidElementIds.forEach((id) => {
      builder.deleteElement(id);
    });
    builder.commit();
  }
  sortSceneTopDown(scene, canvasRegistry, scene.staticForegroundLayer);
  keepAttachedTextAboveHosts(scene, canvasRegistry, scene.staticForegroundLayer);
  scene.stage.batchDraw();
}

/**
 * Rebuilds runtime scene from CRDT document for migrated groups and elements.
 */
export function createSceneHydratorPlugin(): IPlugin<{
  crdt: CrdtService;
  editor: EditorService;
  scene: SceneService;
  selection: SelectionService;
  canvasRegistry: CanvasRegistryService;
}, IRuntimeHooks> {
  return {
    name: "scene-hydrator",
    apply(ctx) {
      const crdt = ctx.services.require("crdt");
      const editor = ctx.services.require("editor");
      const scene = ctx.services.require("scene");
      const selection = ctx.services.require("selection");
      const canvasRegistry = ctx.services.require("canvasRegistry");

      let destroyed = false;
      let isReloading = false;
      let reloadQueued = false;

      const reloadCanvas = async () => {
        if (destroyed) {
          return;
        }

        if (isReloading) {
          reloadQueued = true;
          return;
        }

        isReloading = true;

        try {
          const snapshot = captureSceneState(selection, editor);
          scene.staticForegroundLayer.destroyChildren();
          loadCanvas(crdt, canvasRegistry, scene);
          restoreSceneState(scene, selection, editor, snapshot);
        } finally {
          isReloading = false;
        }

        if (reloadQueued) {
          reloadQueued = false;
          await reloadCanvas();
        }
      };

      crdt.hooks.change.tap(() => {
        if (destroyed) {
          return;
        }

        const consumedLocalChange = crdt.consumePendingLocalChangeEvent();
        if (consumedLocalChange) {
          return;
        }

        void reloadCanvas();
      });

      ctx.hooks.initAsync.tapPromise(async () => {
        loadCanvas(crdt, canvasRegistry, scene);
      });

      ctx.hooks.destroy.tap(() => {
        destroyed = true;
      });
    },
  };
}
