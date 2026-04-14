import type { IPlugin } from "@vibecanvas/runtime";
import type { TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import Konva from "konva";
import { fxIsCanvasGroupNode } from "../../core/fx.canvas-node-semantics";
import type { CrdtService } from "../../services/crdt/CrdtService";
import type { EditorService } from "../../services/editor/EditorService";
import type { SceneService } from "../../services/scene/SceneService";
import type { SelectionService } from "../../services/selection/SelectionService";
import type { IHooks } from "../../runtime";

const ATTACHED_TEXT_NAME = "attached-text";

type TSceneNode = Konva.Group | Konva.Shape;
type TSceneStateSnapshot = {
  selectionIds: string[];
  focusedId: string | null;
  editingTextId: string | null;
  editingShape1dId: string | null;
};

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
    return (candidate instanceof Konva.Group || candidate instanceof Konva.Shape) && candidate.id() === id;
  });

  if (!(node instanceof Konva.Group) && !(node instanceof Konva.Shape)) {
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
  editor: EditorService;
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

      const groupNode = args.editor.createGroupFromTGroup(group);
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
  editor: EditorService;
  scene: SceneService;
}) {
  const groupsById = new Map(
    args.scene.staticForegroundLayer.find((candidate: Konva.Node) => {
      return fxIsCanvasGroupNode({}, { editor: args.editor, node: candidate });
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

    const node = args.editor.createShapeFromTElement(element);
    if (!node) {
      return;
    }

    parent.add(node);
  });

  return invalidElementIds;
}

function sortSceneTopDown(scene: SceneService, editor: EditorService, parent: Konva.Layer | Konva.Group) {
  parent.getChildren()
    .filter((candidate): candidate is TSceneNode => candidate instanceof Konva.Group || candidate instanceof Konva.Shape)
    .slice()
    .sort((left, right) => {
      return compareByPersistedOrder(
        { id: left.id(), zIndex: left.getAttr("vcZIndex") as string | undefined },
        { id: right.id(), zIndex: right.getAttr("vcZIndex") as string | undefined },
      );
    })
    .forEach((child, index) => {
      child.zIndex(index);
      if (fxIsCanvasGroupNode({}, { editor, node: child })) {
        sortSceneTopDown(scene, editor, child as Konva.Group);
      }
    });
}

function isAttachedTextNode(node: Konva.Node): node is Konva.Text {
  return node instanceof Konva.Text
    && node.name() === ATTACHED_TEXT_NAME
    && typeof node.getAttr("vcContainerId") === "string";
}

function keepAttachedTextAboveHosts(scene: SceneService, editor: EditorService, parent: Konva.Layer | Konva.Group) {
  void scene;

  const orderedChildren = parent.getChildren()
    .filter((candidate): candidate is TSceneNode => candidate instanceof Konva.Group || candidate instanceof Konva.Shape);
  const attachedTextByHostId = new Map<string, Konva.Text[]>();
  const detached: TSceneNode[] = [];

  orderedChildren.forEach((child) => {
    if (fxIsCanvasGroupNode({}, { editor, node: child })) {
      keepAttachedTextAboveHosts(scene, editor, child as Konva.Group);
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
    if (fxIsCanvasGroupNode({}, { editor, node: child })) {
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

function loadCanvas(crdt: CrdtService, editor: EditorService, scene: SceneService) {
  const doc = crdt.doc();
  const groups = Object.values(doc.groups).sort(compareByPersistedOrder);
  const elements = Object.values(doc.elements).sort(compareByPersistedOrder);

  loadGroupsTopDown({ groups, editor, scene });
  const invalidElementIds = loadElementsTopDown({ elements, editor, scene });
  if (invalidElementIds.length > 0) {
    crdt.deleteById({ elementIds: invalidElementIds });
  }
  sortSceneTopDown(scene, editor, scene.staticForegroundLayer);
  keepAttachedTextAboveHosts(scene, editor, scene.staticForegroundLayer);
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
}, IHooks> {
  return {
    name: "scene-hydrator",
    apply(ctx) {
      const crdt = ctx.services.require("crdt");
      const editor = ctx.services.require("editor");
      const scene = ctx.services.require("scene");
      const selection = ctx.services.require("selection");

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
          loadCanvas(crdt, editor, scene);
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
        loadCanvas(crdt, editor, scene);
      });

      ctx.hooks.destroy.tap(() => {
        destroyed = true;
      });
    },
  };
}
