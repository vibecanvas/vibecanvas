import type Konva from "konva";
import type { TElement, TGroup } from "@vibecanvas/shell/automerge/types/canvas-doc";
import type { IPlugin, IPluginContext } from "./interface";

type TMountedGroups = Map<string, Konva.Group>;

const CLEAN_ON_LOAD = true;

export class SceneHydratorPlugin implements IPlugin {
  apply(context: IPluginContext): void {
    context.hooks.initAsync.tapPromise(async () => {
      await this.loadCanvas(context);
    });
  }

  async loadCanvas(context: IPluginContext) {
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
