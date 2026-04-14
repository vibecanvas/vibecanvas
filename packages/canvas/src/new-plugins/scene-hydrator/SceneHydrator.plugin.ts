import type { IPlugin } from "@vibecanvas/runtime";
import type { TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import { fxIsCanvasGroupNode } from "../../core/fn.canvas-node-semantics";
import { ATTACHED_TEXT_NAME } from "../shape2d/fx.attached-text";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import type { IHooks } from "../../runtime";

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

function findSceneNodeById(render: RenderService, id: string | null): TSceneNode | null {
  if (!id) {
    return null;
  }

  const node = render.staticForegroundLayer.findOne((candidate: Konva.Node) => {
    return (candidate instanceof render.Group || candidate instanceof render.Shape) && candidate.id() === id;
  });

  if (!(node instanceof render.Group) && !(node instanceof render.Shape)) {
    return null;
  }

  return node;
}

function restoreSceneState(render: RenderService, selection: SelectionService, editor: EditorService, snapshot: TSceneStateSnapshot) {
  const nextSelection = snapshot.selectionIds
    .map((id) => findSceneNodeById(render, id))
    .filter((node): node is TSceneNode => node !== null);

  selection.setSelection(nextSelection);
  selection.setFocusedId(findSceneNodeById(render, snapshot.focusedId)?.id() ?? null);
  editor.setEditingTextId(findSceneNodeById(render, snapshot.editingTextId)?.id() ?? null);
  editor.setEditingShape1dId(findSceneNodeById(render, snapshot.editingShape1dId)?.id() ?? null);
}

function loadGroupsTopDown(args: {
  groups: TGroup[];
  editor: EditorService;
  render: RenderService;
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
        : args.render.staticForegroundLayer;
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
  render: RenderService;
}) {
  const groupsById = new Map(
    args.render.staticForegroundLayer.find((candidate: Konva.Node) => {
      return fxIsCanvasGroupNode({ editor: args.editor, node: candidate });
    }).map((candidate) => [candidate.id(), candidate as Konva.Group]),
  );
  const invalidElementIds: string[] = [];

  args.elements.forEach((element) => {
    const parent = element.parentGroupId
      ? groupsById.get(element.parentGroupId)
      : args.render.staticForegroundLayer;
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

function sortSceneTopDown(render: RenderService, editor: EditorService, parent: Konva.Layer | Konva.Group) {
  parent.getChildren()
    .filter((candidate): candidate is TSceneNode => candidate instanceof render.Group || candidate instanceof render.Shape)
    .slice()
    .sort((left, right) => {
      return compareByPersistedOrder(
        { id: left.id(), zIndex: left.getAttr("vcZIndex") as string | undefined },
        { id: right.id(), zIndex: right.getAttr("vcZIndex") as string | undefined },
      );
    })
    .forEach((child, index) => {
      child.zIndex(index);
      if (fxIsCanvasGroupNode({ editor, node: child })) {
        sortSceneTopDown(render, editor, child as Konva.Group);
      }
    });
}

function isAttachedTextNode(render: RenderService, node: Konva.Node): node is Konva.Text {
  return node instanceof render.Text
    && node.name() === ATTACHED_TEXT_NAME
    && typeof node.getAttr("vcContainerId") === "string";
}

function keepAttachedTextAboveHosts(render: RenderService, editor: EditorService, parent: Konva.Layer | Konva.Group) {
  const orderedChildren = parent.getChildren()
    .filter((candidate): candidate is TSceneNode => candidate instanceof render.Group || candidate instanceof render.Shape);
  const attachedTextByHostId = new Map<string, Konva.Text[]>();
  const detached: TSceneNode[] = [];

  orderedChildren.forEach((child) => {
    if (fxIsCanvasGroupNode({ editor, node: child })) {
      keepAttachedTextAboveHosts(render, editor, child as Konva.Group);
      detached.push(child);
      return;
    }

    if (!isAttachedTextNode(render, child)) {
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
    if (fxIsCanvasGroupNode({ editor, node: child })) {
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

function loadCanvas(crdt: CrdtService, editor: EditorService, render: RenderService) {
  const doc = crdt.doc();
  const groups = Object.values(doc.groups).sort(compareByPersistedOrder);
  const elements = Object.values(doc.elements).sort(compareByPersistedOrder);

  loadGroupsTopDown({ groups, editor, render });
  const invalidElementIds = loadElementsTopDown({ elements, editor, render });
  if (invalidElementIds.length > 0) {
    crdt.deleteById({ elementIds: invalidElementIds });
  }
  sortSceneTopDown(render, editor, render.staticForegroundLayer);
  keepAttachedTextAboveHosts(render, editor, render.staticForegroundLayer);
  render.stage.batchDraw();
}

/**
 * Rebuilds runtime scene from CRDT document for migrated groups and elements.
 */
export function createSceneHydratorPlugin(): IPlugin<{
  crdt: CrdtService;
  editor: EditorService;
  render: RenderService;
  selection: SelectionService;
}, IHooks> {
  return {
    name: "scene-hydrator",
    apply(ctx) {
      const crdt = ctx.services.require("crdt");
      const editor = ctx.services.require("editor");
      const render = ctx.services.require("render");
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
          render.staticForegroundLayer.destroyChildren();
          loadCanvas(crdt, editor, render);
          restoreSceneState(render, selection, editor, snapshot);
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
        loadCanvas(crdt, editor, render);
      });

      ctx.hooks.destroy.tap(() => {
        destroyed = true;
      });
    },
  };
}
