import type { DocHandleChangePayload } from "@automerge/automerge-repo";
import Konva from "konva";
import type { TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type { IPlugin, IPluginContext } from "../shared/interface";

type TMountedGroups = Map<string, Konva.Group>;
type TSceneNode = Konva.Group | Konva.Shape;
type TSceneStateSnapshot = {
  selectionIds: string[];
  focusedId: string | null;
  editingTextId: string | null;
  editingShape1dId: string | null;
};

const CLEAN_ON_LOAD = true;

export class SceneHydratorPlugin implements IPlugin {
  apply(context: IPluginContext): void {
    let isReloading = false;
    let reloadQueued = false;

    const reloadCanvas = async () => {
      if (isReloading) {
        reloadQueued = true;
        return;
      }

      isReloading = true;

      try {
        this.reloadCanvas(context);
      } finally {
        isReloading = false;
      }

      if (reloadQueued) {
        reloadQueued = false;
        await reloadCanvas();
      }
    };

    const onDocChange = async (_payload: DocHandleChangePayload<unknown>) => {
      if (context.crdt.consumePendingLocalChangeEvent()) {
        return;
      }

      await reloadCanvas();
    };

    context.hooks.initAsync.tapPromise(async () => {
      this.loadCanvas(context);
      context.crdt.docHandle.on("change", onDocChange as (payload: DocHandleChangePayload<any>) => void);
    });

    context.hooks.destroy.tap(() => {
      context.crdt.docHandle.off("change", onDocChange as (payload: DocHandleChangePayload<any>) => void);
    });
  }

  loadCanvas(context: IPluginContext) {
    const doc = context.crdt.docHandle.doc();
    const groupsById = new Map(Object.entries(doc.groups));
    const elementsById = new Map(Object.entries(doc.elements));
    const remainingGroupIds = new Set(groupsById.keys());
    const remainingElementIds = new Set(elementsById.keys());
    const mountedGroups: TMountedGroups = new Map();

    this.loadGroupsTopDown(context, {
      groupsById,
      remainingGroupIds,
      mountedGroups,
    });

    this.loadElementsTopDown(context, {
      elementsById,
      remainingElementIds,
      mountedGroups,
    });

    this.cleanupUnresolvedNodes(context, {
      remainingGroupIds,
      remainingElementIds,
      cleanOnLoad: CLEAN_ON_LOAD,
    });

    this.applyPersistedOrdering(context, context.staticForegroundLayer);
    context.stage.batchDraw();
  }

  private reloadCanvas(context: IPluginContext) {
    const snapshot = this.captureSceneState(context);

    context.staticForegroundLayer.destroyChildren();
    this.loadCanvas(context);
    this.restoreSceneState(context, snapshot);
  }

  private captureSceneState(context: IPluginContext): TSceneStateSnapshot {
    return {
      selectionIds: context.state.selection.map((node) => node.id()),
      focusedId: context.state.focusedId,
      editingTextId: context.state.editingTextId,
      editingShape1dId: context.state.editingShape1dId,
    };
  }

  private restoreSceneState(context: IPluginContext, snapshot: TSceneStateSnapshot) {
    const selection = snapshot.selectionIds
      .map((id) => this.findSceneNodeById(context, id))
      .filter((node): node is TSceneNode => node !== null);

    context.setState("selection", selection);
    context.setState("focusedId", this.findSceneNodeById(context, snapshot.focusedId)?.id() ?? null);
    context.setState("editingTextId", this.findSceneNodeById(context, snapshot.editingTextId)?.id() ?? null);
    context.setState("editingShape1dId", this.findSceneNodeById(context, snapshot.editingShape1dId)?.id() ?? null);
  }

  private findSceneNodeById(context: IPluginContext, id: string | null): TSceneNode | null {
    if (!id) return null;

    const node = context.staticForegroundLayer.findOne((candidate: Konva.Node) => {
      return (candidate instanceof Konva.Group || candidate instanceof Konva.Shape) && candidate.id() === id;
    });

    if (!(node instanceof Konva.Group) && !(node instanceof Konva.Shape)) {
      return null;
    }

    return node;
  }

  private applyPersistedOrdering(context: IPluginContext, parent: Konva.Layer | Konva.Group) {
    context.capabilities.renderOrder?.sortChildren(parent);

    parent.getChildren().forEach((child) => {
      if (!(child instanceof Konva.Group)) return;
      this.applyPersistedOrdering(context, child);
    });
  }

  private cleanupUnresolvedNodes(
    context: IPluginContext,
    args: {
      remainingGroupIds: Set<string>;
      remainingElementIds: Set<string>;
      cleanOnLoad: boolean;
    },
  ) {
    if (!args.cleanOnLoad) {
      return;
    }

    if (args.remainingGroupIds.size === 0 && args.remainingElementIds.size === 0) {
      return;
    }

    context.crdt.deleteById({
      groupIds: [...args.remainingGroupIds],
      elementIds: [...args.remainingElementIds],
    });
  }

  private loadGroupsTopDown(
    context: IPluginContext,
    args: {
      groupsById: Map<string, TGroup>;
      remainingGroupIds: Set<string>;
      mountedGroups: TMountedGroups;
    },
  ) {
    while (args.remainingGroupIds.size > 0) {
      let loadedInPass = false;

      for (const groupId of [...args.remainingGroupIds]) {
        const group = args.groupsById.get(groupId);
        if (!group) {
          args.remainingGroupIds.delete(groupId);
          continue;
        }

        const parentNode = group.parentGroupId ? args.mountedGroups.get(group.parentGroupId) : context.staticForegroundLayer;
        if (!parentNode) {
          continue;
        }

        const groupNode = context.capabilities.createGroupFromTGroup?.(group);
        args.remainingGroupIds.delete(groupId);
        if (!groupNode) {
          continue;
        }

        parentNode.add(groupNode);
        args.mountedGroups.set(groupId, groupNode);
        loadedInPass = true;
      }

      if (!loadedInPass) {
        break;
      }
    }
  }

  private loadElementsTopDown(
    context: IPluginContext,
    args: {
      elementsById: Map<string, TElement>;
      remainingElementIds: Set<string>;
      mountedGroups: TMountedGroups;
    },
  ) {
    while (args.remainingElementIds.size > 0) {
      let loadedInPass = false;

      for (const elementId of [...args.remainingElementIds]) {
        const element = args.elementsById.get(elementId);
        if (!element) {
          args.remainingElementIds.delete(elementId);
          continue;
        }

        const parentNode = element.parentGroupId ? args.mountedGroups.get(element.parentGroupId) : context.staticForegroundLayer;
        if (!parentNode) {
          continue;
        }

        const shape = context.capabilities.createShapeFromTElement?.(element);
        args.remainingElementIds.delete(elementId);
        if (!shape) {
          continue;
        }

        parentNode.add(shape);
        loadedInPass = true;
      }

      if (!loadedInPass) {
        break;
      }
    }
  }
}
