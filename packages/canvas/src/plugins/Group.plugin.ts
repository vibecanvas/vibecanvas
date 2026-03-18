import Konva from "konva";
import { createEffect } from "solid-js";
import { CustomEvents } from "../custom-events";
import { CanvasMode } from "../services/canvas/enum";
import type { IPlugin, IPluginContext } from "./interface";
import { Shape2dPlugin } from "./Shape2d.plugin";
import { TElement, TGroup } from "@vibecanvas/shell/automerge/index";
import { TransformPlugin } from "./Transform.plugin";


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
      if (event.key === 'g' && event.metaKey && !event.shiftKey) {
        // prevent default search popup
        event.preventDefault()
        event.stopPropagation()
        if (context.state.mode === CanvasMode.SELECT && context.state.selection.length > 1) {
          console.log('group')
          const newGroup = GroupPlugin.group(context, context.state.selection)
          this.setupGroupListeners(context, newGroup)

        }

      } else if (event.key === 'g' && event.metaKey && event.shiftKey) {
        // prevent default search popup
        event.preventDefault()
        event.stopPropagation()
        if (context.state.mode === CanvasMode.SELECT && context.state.selection.length > 0) {
          console.log('ungroup')

        }
      }
    })

    context.hooks.init.tap(() => {
      this.setupReaction(context)
    })
  }

  static group(context: IPluginContext, selections: (Konva.Group | Konva.Shape)[]) {
    const x = Math.min(...selections.map(s => s.x()))
    const y = Math.min(...selections.map(s => s.y()))
    const width = Math.max(...selections.map(s => s.x() + s.width())) - x
    const height = Math.max(...selections.map(s => s.y() + s.height())) - y

    const newGroup = new Konva.Group({
      id: crypto.randomUUID(),
      x,
      y,
      width,
      height,
      draggable: true,
    })
    context.staticForegroundLayer.add(newGroup)

    selections.forEach(node => {
      const absolutePosition = node.getAbsolutePosition(context.staticForegroundLayer)
      newGroup.add(node)
      node.setAbsolutePosition(absolutePosition)
      node.setDraggable(false)
    })

    return newGroup;
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

  private static refreshCloneSubtree(clone: Konva.Group) {
    clone.id(crypto.randomUUID())
    clone.setDraggable(true)

    clone.getChildren().forEach(node => {
      if (node instanceof Konva.Group) {
        this.refreshCloneSubtree(node)
      } else {
        node.id(crypto.randomUUID())
        node.setDraggable(false)
      }
    })
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
      // deepest selected node wins
      const active = TransformPlugin.filterSelection(context.state.selection)[0];
      if (active) {
        active.draggable(true);
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
    const clone = group.clone()
    GroupPlugin.refreshCloneSubtree(clone)

    context.dynamicLayer.add(clone)
    this.setupGroupListeners(context, clone)
    this.selectGroup(context, clone)
    context.setState('selection', [clone])

    clone.startDrag()
    clone.on('dragend', () => {
      clone.moveTo(context.staticForegroundLayer)
      clone.setDraggable(true)
      context.setState('selection', [clone])
    })

    return clone
  }

  setupGroupListeners(context: IPluginContext, group: Konva.Group) {
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
        group.stopDrag()
        this.createCloneDrag(context, group)
      }
    })

    group.on('dragmove transform', e => {
      this.#boundaries.values().forEach(b => b.update())
    })
  }



}
