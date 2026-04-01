import Konva from "konva";
import { createEffect } from "solid-js";
import { CanvasMode } from "../../services/canvas/enum";
import type { IPlugin, IPluginContext } from "../shared/interface";
import { TransformPlugin } from "../Transform/Transform.plugin";
import { setNodeZIndex } from "../shared/render-order.shared";
import { createBoundaryRect } from "./Group.boundary";
import {
  createPreviewClone,
  finalizePreviewClone,
  refreshCloneSubtree,
  startSingleCloneDrag,
} from "./Group.clone";
import { toTGroup } from "./Group.helpers";
import { setupGroupListeners } from "./Group.listeners";
import { groupNodes, ungroupNodes } from "./Group.operations";
import type { GroupBoundary, GroupSelectionNode } from "./Group.shared";


export class GroupPlugin implements IPlugin {
  #boundaries: Map<string, GroupBoundary> = new Map()

  constructor() {

  }

  apply(context: IPluginContext): void {
    context.hooks.cameraChange.tap(() => {
      this.#boundaries.forEach(boundary => {
        if (boundary.node.visible()) {
          boundary.update()
        }
      })
    })

    context.hooks.keydown.tap(event => {
      if (context.state.mode !== CanvasMode.SELECT) return;
      if (event.key === 'g' && (event.metaKey || event.ctrlKey) && !event.shiftKey) {
        // prevent default search popup
        event.preventDefault()
        event.stopPropagation()
        if (context.state.mode === CanvasMode.SELECT && context.state.selection.length > 1) {
          const newGroup = GroupPlugin.group(context, context.state.selection)
          this.setupGroupListeners(context, newGroup)
          context.setState('selection', [newGroup])
        }

      } else if (event.key === 'g' && (event.metaKey || event.ctrlKey) && event.shiftKey) {
        // prevent default search popup
        event.preventDefault()
        event.stopPropagation()
        if (context.state.mode === CanvasMode.SELECT && context.state.selection.length > 0) {
          const group = [...context.state.selection].reverse().find(
            (selection): selection is Konva.Group => selection instanceof Konva.Group,
          )
          if (!group) return

          const children = GroupPlugin.ungroup(context, group)
          context.setState('selection', children)

        }
      }
    })

    context.hooks.init.tap(() => {
      this.setupReaction(context)
      this.setupCapablities(context)
    })
  }

  static group(context: IPluginContext, selections: (Konva.Group | Konva.Shape)[]) {
    return groupNodes(context, selections)
  }

  private static groupWithOptions(
    context: IPluginContext,
    selections: GroupSelectionNode[],
    args?: { groupId?: string, recordHistory?: boolean },
  ) {
    return groupNodes(context, selections, args)
  }

  static ungroup(context: IPluginContext, group: Konva.Group) {
    return ungroupNodes(context, group)
  }

  private static ungroupWithOptions(
    context: IPluginContext,
    group: Konva.Group,
    args?: { recordHistory?: boolean },
  ) {
    return ungroupNodes(context, group, args)
  }

  static refreshCloneSubtree(clone: Konva.Group) {
    return refreshCloneSubtree(clone)
  }

  static createPreviewClone(group: Konva.Group) {
    return createPreviewClone(group)
  }

  static finalizePreviewClone(context: IPluginContext, clone: Konva.Group, plugin?: GroupPlugin) {
    return finalizePreviewClone({
      context,
      setupGroupListeners: (cloneContext, cloneGroup) => {
        GroupPlugin.setupGroupListenersStatic(cloneContext, cloneGroup, plugin)
      },
    }, clone)
  }

  static startSingleCloneDrag(context: IPluginContext, group: Konva.Group, plugin?: GroupPlugin) {
    return startSingleCloneDrag({
      context,
      setupGroupListeners: (cloneContext, cloneGroup) => {
        GroupPlugin.setupGroupListenersStatic(cloneContext, cloneGroup, plugin)
      },
    }, group)
  }

  static toTGroup(group: Konva.Group) {
    return toTGroup(group)
  }

  private setupCapablities(context: IPluginContext) {
    context.capabilities.createGroupFromTGroup = (group) => {
      const konvaGroup = new Konva.Group({
        id: group.id,
        draggable: true,
      })
      setNodeZIndex(konvaGroup, group.zIndex)
      this.setupGroupListeners(context, konvaGroup)
      return konvaGroup
    }

    context.capabilities.toGroup = (node) => {
      return toTGroup(node)
    }
  }

  private setupReaction(context: IPluginContext) {
    createEffect(() => {
      const markedToRemove = new Set(this.#boundaries.keys())
      context.state.selection.filter(sel => sel instanceof Konva.Group).forEach(group => {
        setTimeout(() => {
          // circumvent set fighting
          this.selectGroup(context, group)
        })
        markedToRemove.delete(group.id())
      })
      markedToRemove.forEach(id => {
        const boundary = this.#boundaries.get(id)
        if (!boundary) return
        boundary.hide()
        boundary.node.destroy()
        this.#boundaries.delete(id)
      })


    })

    /**
     * Set draggable state for all groups on selection change
     * to allow nested group dragging
     */
    createEffect(() => {
      const allNodes = context.staticForegroundLayer.find(
        (node: any) => node instanceof Konva.Group || node instanceof Konva.Shape
      ) as Array<Konva.Group | Konva.Shape>;
      // disable drag for everything first
      allNodes.forEach(node => node.draggable(false));
      // all selected nodes are draggable so multi-select drag works
      const activeNodes = TransformPlugin.filterSelection(context.state.selection);
      if (activeNodes.length > 0) {
        activeNodes.forEach(node => node.draggable(true));
        return;
      }
      // fallback: only top-level groups draggable
      context.staticForegroundLayer.getChildren().forEach(node => {
        if (node instanceof Konva.Group) node.draggable(true);
      });
    });
  }

  private selectGroup(context: IPluginContext, group: Konva.Group) {
    const { getBoundaryBox, hide, node, show, update } = this.#boundaries.get(group.id()) ?? createBoundaryRect(context, group)
    this.#boundaries.set(group.id(), { getBoundaryBox, hide, node, show, update })
    context.dynamicLayer.add(node)
    show()
  }

  private createCloneDrag(context: IPluginContext, group: Konva.Group) {
    const clone = startSingleCloneDrag({
      context,
      setupGroupListeners: (cloneContext, cloneGroup) => this.setupGroupListeners(cloneContext, cloneGroup),
    }, group)
    this.selectGroup(context, clone)
    return clone
  }

  setupGroupListeners(context: IPluginContext, group: Konva.Group) {
    GroupPlugin.setupGroupListenersStatic(context, group, this)
  }

  static setupGroupListenersStatic(context: IPluginContext, group: Konva.Group, plugin?: GroupPlugin) {
    setupGroupListeners({
      context,
      updateBoundaries: plugin
        ? () => {
          for (const boundary of plugin.#boundaries.values()) {
            boundary.update()
          }
        }
        : undefined,
      createCloneDrag: plugin
        ? (listenerContext, listenerGroup) => {
          plugin.createCloneDrag(listenerContext, listenerGroup)
        }
        : undefined,
      startSingleCloneDrag: (listenerContext, listenerGroup) => {
        startSingleCloneDrag({
          context: listenerContext,
          setupGroupListeners: (cloneContext, cloneGroup) => {
            GroupPlugin.setupGroupListenersStatic(cloneContext, cloneGroup, plugin)
          },
        }, listenerGroup)
      },
    }, group)
  }



}
