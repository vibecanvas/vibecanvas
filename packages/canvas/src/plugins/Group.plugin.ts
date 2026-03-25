import Konva from "konva";
import { createEffect } from "solid-js";
import { CustomEvents } from "../custom-events";
import { CanvasMode } from "../services/canvas/enum";
import type { IPlugin, IPluginContext } from "./interface";
import { startSelectionCloneDrag } from "./clone-drag";
import { PenPlugin } from "./Pen.plugin";
import { Shape2dPlugin } from "./Shape2d.plugin";
import { TextPlugin } from "./Text.plugin";
import { TElement, TGroup } from "@vibecanvas/shell/automerge/index";
import { TransformPlugin } from "./Transform.plugin";
import { throttle } from "@solid-primitives/scheduled";
import { getNodeZIndex, setNodeZIndex } from "./render-order.shared";


export class GroupPlugin implements IPlugin {
  #boundaries: Map<string, { node: Konva.Rect, update: () => void, show: () => void, hide: () => void, getBoundaryBox: () => { x: number, y: number, width: number, height: number } }> = new Map()

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
    return GroupPlugin.groupWithOptions(context, selections)
  }

  private static groupWithOptions(
    context: IPluginContext,
    selections: (Konva.Group | Konva.Shape)[],
    args?: { groupId?: string, recordHistory?: boolean },
  ) {
    selections = GroupPlugin.expandSelectionsWithAttachedText(context, selections)
    selections = [...selections].sort((a, b) => a.zIndex() - b.zIndex())
    const resolveParent = (node: Konva.Group | Konva.Shape) => {
      const candidate = node.getParent()
      return candidate instanceof Konva.Group || candidate instanceof Konva.Layer
        ? candidate
        : context.staticForegroundLayer
    }
    const parent = resolveParent(selections[0])
    if (!selections.every((node) => resolveParent(node) === parent)) {
      throw new Error('Cannot group selections from different parents')
    }
    const insertionPosition = GroupPlugin.getInsertionPosition(parent, selections)
    const x = Math.min(...selections.map(s => s.x()))
    const y = Math.min(...selections.map(s => s.y()))
    const width = Math.max(...selections.map(s => s.x() + s.width())) - x
    const height = Math.max(...selections.map(s => s.y() + s.height())) - y
    const selectionIds = selections.map(node => node.id())
    const groupId = args?.groupId ?? crypto.randomUUID()

    const newGroup = context.capabilities.createGroupFromTGroup?.({
      id: groupId,
      parentGroupId: parent instanceof Konva.Group ? parent.id() : null,
      zIndex: '',
      locked: false,
      createdAt: Date.now(),
    }) ?? new Konva.Group({ id: groupId, draggable: true })
    newGroup.setAttrs({ x, y, width, height, draggable: true })
    parent.add(newGroup)
    context.capabilities.renderOrder?.assignOrderOnInsert({
      parent,
      nodes: [newGroup],
      position: insertionPosition,
    })

    const parentNode = newGroup.getParent()
    const parentGroupId = parentNode instanceof Konva.Group ? parentNode.id() : null
    const groupPatches: TGroup[] = [context.capabilities.toGroup?.(newGroup) ?? GroupPlugin.toTGroup(newGroup)]
    const elementPatches: TElement[] = []

    selections.forEach(node => {
      const absolutePosition = node.getAbsolutePosition()
      newGroup.add(node)
      node.setAbsolutePosition(absolutePosition)
      node.setDraggable(false)

      if (node instanceof Konva.Group) {
        groupPatches.push(context.capabilities.toGroup?.(node) ?? GroupPlugin.toTGroup(node))
        return
      }

      const el = context.capabilities.toElement?.(node) ?? Shape2dPlugin.toTElement(node)
      elementPatches.push(el)
    })

    context.capabilities.renderOrder?.sortChildren(newGroup)

    context.crdt.patch({ elements: elementPatches, groups: groupPatches })

    if (args?.recordHistory !== false) {
      context.history.record({
        label: 'group',
        undo: () => {
          const existingGroup = GroupPlugin.findGroupById(context, newGroup.id())
          if (!existingGroup) return
          const children = GroupPlugin.ungroupWithOptions(context, existingGroup, { recordHistory: false })
          context.setState('selection', children)
        },
        redo: () => {
          const nodes = GroupPlugin.findNodesByIds(context, selectionIds)
          if (nodes.length !== selectionIds.length) return
          const regrouped = GroupPlugin.groupWithOptions(context, nodes, {
            groupId: newGroup.id(),
            recordHistory: false,
          })
          context.setState('selection', [regrouped])
        },
      })
    }

    return newGroup;
  }

  private static expandSelectionsWithAttachedText(
    context: IPluginContext,
    selections: (Konva.Group | Konva.Shape)[],
  ) {
    const expanded = [...selections]
    const seen = new Set(expanded.map(node => node.id()))

    selections.forEach(node => {
      if (!(node instanceof Konva.Rect)) return

      const attachedText = context.staticForegroundLayer.findOne((candidate: Konva.Node) => {
        return candidate instanceof Konva.Text && candidate.getAttr('vcContainerId') === node.id()
      })

      if (!(attachedText instanceof Konva.Text)) return
      if (seen.has(attachedText.id())) return

      expanded.push(attachedText)
      seen.add(attachedText.id())
    })

    return expanded
  }

  static ungroup(context: IPluginContext, group: Konva.Group) {
    return GroupPlugin.ungroupWithOptions(context, group)
  }

  private static ungroupWithOptions(
    context: IPluginContext,
    group: Konva.Group,
    args?: { recordHistory?: boolean },
  ) {
    const parent = group.getParent()
    if (!parent) return []
    if (!(parent instanceof Konva.Group || parent instanceof Konva.Layer)) return []
    const insertionPosition = GroupPlugin.getInsertionPosition(parent, [group])

    const children = group.getChildren().slice() as (Konva.Group | Konva.Shape)[]
    const childIds = children.map(node => node.id())
    const nextParentGroupId = parent instanceof Konva.Group ? parent.id() : null
    const elementPatches: TElement[] = []
    const groupPatches: TGroup[] = []

    children.forEach(node => {
      const absolutePosition = node.getAbsolutePosition()
      parent.add(node)
      node.setAbsolutePosition(absolutePosition)

      if (node instanceof Konva.Group) {
        groupPatches.push(context.capabilities.toGroup?.(node) ?? GroupPlugin.toTGroup(node))
        return
      }

      node.setDraggable(true)
      const el = context.capabilities.toElement?.(node) ?? Shape2dPlugin.toTElement(node)
      elementPatches.push(el)
    })

    group.destroy()
    context.capabilities.renderOrder?.assignOrderOnInsert({
      parent,
      nodes: children,
      position: insertionPosition,
    })
    context.crdt.patch({ elements: elementPatches, groups: groupPatches })
    context.crdt.deleteById({ groupIds: [group.id()] })

    if (args?.recordHistory !== false) {
      context.history.record({
        label: 'ungroup',
        undo: () => {
          const nodes = GroupPlugin.findNodesByIds(context, childIds)
          if (nodes.length !== childIds.length) return
          const regrouped = GroupPlugin.groupWithOptions(context, nodes, {
            groupId: group.id(),
            recordHistory: false,
          })
          context.setState('selection', [regrouped])
        },
        redo: () => {
          const existingGroup = GroupPlugin.findGroupById(context, group.id())
          if (!existingGroup) return
          const ungroupedChildren = GroupPlugin.ungroupWithOptions(context, existingGroup, { recordHistory: false })
          context.setState('selection', ungroupedChildren)
        },
      })
    }

    return children
  }

  private static findNodeById(context: IPluginContext, id: string) {
    return context.staticForegroundLayer.findOne((node: any) => {
      return (node instanceof Konva.Group || node instanceof Konva.Shape) && node.id() === id
    }) as Konva.Group | Konva.Shape | null
  }

  private static findGroupById(context: IPluginContext, id: string) {
    const node = GroupPlugin.findNodeById(context, id)
    return node instanceof Konva.Group ? node : null
  }

  private static findNodesByIds(context: IPluginContext, ids: string[]) {
    return ids
      .map(id => GroupPlugin.findNodeById(context, id))
      .filter((node): node is Konva.Group | Konva.Shape => Boolean(node))
  }

  private static getInsertionPosition(
    parent: Konva.Layer | Konva.Group,
    nodes: Array<Konva.Group | Konva.Shape>,
  ): "front" | "back" | { beforeId?: string; afterId?: string } {
    const siblingIds = parent.getChildren()
      .filter((node): node is Konva.Group | Konva.Shape => node instanceof Konva.Group || node instanceof Konva.Shape)
      .map((node) => node.id())
    const selectedIds = new Set(nodes.map((node) => node.id()))
    const selectedIndexes = siblingIds
      .map((id, index) => selectedIds.has(id) ? index : -1)
      .filter((index) => index >= 0)

    if (selectedIndexes.length === 0) return 'front'

    const firstIndex = Math.min(...selectedIndexes)
    const lastIndex = Math.max(...selectedIndexes)
    const beforeId = siblingIds[firstIndex - 1]
    const afterId = siblingIds[lastIndex + 1]

    if (beforeId) return { afterId: beforeId }
    if (afterId) return { beforeId: afterId }
    return 'front'
  }

  private static createBoundaryRect(context: IPluginContext, group: Konva.Group) {
    const boundary = new Konva.Rect({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      stroke: '#1e1e1e',
      dash: [11, 11],
      strokeWidth: 2,
      strokeScaleEnabled: false,
      draggable: false,
      listening: false,
      visible: false,
      name: 'group-boundary:' + group.id(),
    })

    const getBoundaryBox = () => {
      const groupRect = group.getClientRect({
        relativeTo: group,
      })

      return {
        x: groupRect.x,
        y: groupRect.y,
        width: groupRect.width,
        height: groupRect.height,
      }
    }

    const update = () => {
      const box = getBoundaryBox()
      const groupTransform = group.getAbsoluteTransform()
      const dynamicLayerInverseTransform = context.dynamicLayer.getAbsoluteTransform().copy()
      dynamicLayerInverseTransform.invert()

      const topLeft = dynamicLayerInverseTransform.point(groupTransform.point({ x: box.x, y: box.y }))
      const topRight = dynamicLayerInverseTransform.point(groupTransform.point({
        x: box.x + box.width,
        y: box.y,
      }))
      const bottomLeft = dynamicLayerInverseTransform.point(groupTransform.point({
        x: box.x,
        y: box.y + box.height,
      }))

      const width = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y)
      const height = Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y)
      const rotation = Math.atan2(topRight.y - topLeft.y, topRight.x - topLeft.x) * 180 / Math.PI

      boundary.position(topLeft)
      boundary.rotation(rotation)
      boundary.scale({ x: 1, y: 1 })
      boundary.size({ width, height })
    }

    const show = () => {
      update()
      boundary.visible(true)
    }

    const hide = () => {
      boundary.visible(false)
    }

    return {
      node: boundary,
      update,
      show,
      hide,
      getBoundaryBox,
    }
  }

  static refreshCloneSubtree(clone: Konva.Group) {
    clone.id(crypto.randomUUID())
    clone.setDraggable(true)
    clone.setAttr('vcGroupListenersSetup', false)

    clone.getChildren().forEach(node => {
      if (node instanceof Konva.Group) {
        this.refreshCloneSubtree(node)
      } else {
        node.id(crypto.randomUUID())
        node.setDraggable(false)
      }
    })
  }

  static createPreviewClone(group: Konva.Group) {
    const clone = Konva.Node.create(group.toJSON()) as Konva.Group
    GroupPlugin.refreshCloneSubtree(clone)
    return clone
  }

  static finalizePreviewClone(context: IPluginContext, clone: Konva.Group) {
    if (clone.isDragging()) {
      clone.stopDrag()
    }

    clone.moveTo(context.staticForegroundLayer)
    context.capabilities.renderOrder?.assignOrderOnInsert({
      parent: context.staticForegroundLayer,
      nodes: [clone],
      position: 'front',
    })

    const groups: TGroup[] = []
    const elements: TElement[] = []

    const registerSubtree = (group: Konva.Group) => {
      GroupPlugin.setupGroupListenersStatic(context, group)
      groups.push((context.capabilities.toGroup?.(group) ?? GroupPlugin.toTGroup(group)) as TGroup)
      group.setDraggable(false)

      group.getChildren().forEach(node => {
        if (node instanceof Konva.Group) {
          registerSubtree(node)
          return
        }

        if (!(node instanceof Konva.Shape)) return

        if (node instanceof Konva.Text) {
          TextPlugin.setupShapeListeners(context, node)
        } else if (node instanceof Konva.Path) {
          PenPlugin.setupShapeListeners(context, node)
        } else {
          Shape2dPlugin.setupShapeListeners(context, node)
        }

        node.setDraggable(false)
        const element = context.capabilities.toElement?.(node)
        if (element) elements.push(element)
      })
    }

    registerSubtree(clone)
    context.crdt.patch({ elements, groups })
    return clone
  }

  static startSingleCloneDrag(context: IPluginContext, group: Konva.Group) {
    const clone = GroupPlugin.createPreviewClone(group)

    context.dynamicLayer.add(clone)
    GroupPlugin.setupGroupListenersStatic(context, clone)
    context.setState('selection', [clone])

    clone.startDrag()
    const finalizeCloneDrag = () => {
      clone.off('dragend', finalizeCloneDrag)
      const finalizedClone = GroupPlugin.finalizePreviewClone(context, clone)
      context.setState('selection', finalizedClone ? [finalizedClone] : [])
    }
    clone.on('dragend', finalizeCloneDrag)

    return clone
  }

  static toTGroup(group: Konva.Group): TGroup {
    const parentGroupId = group.getParent() instanceof Konva.Group ? group.getParent()!.id() : null
    return {
      id: group.id(),
      parentGroupId,
      zIndex: getNodeZIndex(group),
      locked: false,
      createdAt: Date.now(),
    }
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
      return GroupPlugin.toTGroup(node)
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
    const { getBoundaryBox, hide, node, show, update } = this.#boundaries.get(group.id()) ?? GroupPlugin.createBoundaryRect(context, group)
    this.#boundaries.set(group.id(), { getBoundaryBox, hide, node, show, update })
    context.dynamicLayer.add(node)
    show()
  }

  private createCloneDrag(context: IPluginContext, group: Konva.Group) {
    const clone = GroupPlugin.startSingleCloneDrag(context, group)
    this.selectGroup(context, clone)
    return clone
  }

  setupGroupListeners(context: IPluginContext, group: Konva.Group) {
    GroupPlugin.setupGroupListenersStatic(context, group, this)
  }

  static setupGroupListenersStatic(context: IPluginContext, group: Konva.Group, plugin?: GroupPlugin) {
    if (group.getAttr('vcGroupListenersSetup')) return
    group.setAttr('vcGroupListenersSetup', true)

    let isCloneDrag = false

    group.on('pointerclick', e => {
      if (context.state.mode !== CanvasMode.SELECT) return
      context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERCLICK, e)
    })

    group.on('pointerdblclick', e => {
      if (context.state.mode !== CanvasMode.SELECT) return
      const earlyExit = context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERDBLCLICK, e)
      if (earlyExit) e.cancelBubble = true
    })
    group.on('pointerdown dragstart', e => {
      if (context.state.mode !== CanvasMode.SELECT) {
        group.stopDrag()
        return
      }

      if (e.type === 'pointerdown') {
        const earlyExit = context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERDOWN, e)
        if (earlyExit) e.cancelBubble = true
      }

      if (e.type === 'dragstart' && e.evt?.altKey) {
        isCloneDrag = true
        try {
          if (group.isDragging()) {
            group.stopDrag()
          }
        } catch {
          // ignore Konva drag-state mismatch in synthetic paths
        }
        if (startSelectionCloneDrag(context, group)) {
          isCloneDrag = false
          return
        }
        if (plugin) {
          plugin.createCloneDrag(context, group)
        } else {
          GroupPlugin.startSingleCloneDrag(context, group)
        }
      }
    })

    const throttledPatch = throttle((elements: TElement[]) => {
      context.crdt.patch({ elements, groups: [] })
    }, 100)

    group.on('dragmove transform', e => {
      if (e.type === 'dragmove' && isCloneDrag) {
        isCloneDrag = false
        return
      }

      if (plugin) {
        plugin.#boundaries.values().forEach(b => b.update())
      }
      // update shape position, dont propagate to parent
      if (e.currentTarget instanceof Konva.Group && e.type === 'dragmove') {
        const childElements = e.currentTarget
          .find((node: Konva.Node) => node instanceof Konva.Shape)
          .map((node) => {
            const shape = node as Konva.Shape
            return context.capabilities.toElement?.(shape)
          })
          .filter(Boolean) as TElement[]
        throttledPatch(childElements)
        e.cancelBubble = true
      }
    })
  }



}
