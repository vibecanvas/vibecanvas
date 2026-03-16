import Konva from "konva";
import { createEffect } from "solid-js";
import { CustomEvents } from "../custom-events";
import { CanvasMode } from "../services/canvas/enum";
import type { IPlugin, IPluginContext } from "./interface";
import { Shape2dPlugin } from "./Shape2d.plugin";


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
      x,
      y,
      width,
      height,
      draggable: true
    })
    context.staticForegroundLayer.add(newGroup)

    selections.forEach(node => {
      const absolutePosition = node.getAbsolutePosition(context.staticForegroundLayer)
      newGroup.add(node)
      node.setAbsolutePosition(absolutePosition)
      node.setDraggable(false)
      if (node instanceof Konva.Shape && Shape2dPlugin.supportedTypes.has(node.getAttr('backendData').data.type)) {
        // TODO: must find better solution without group changes node
        // Shape2dPlugin.removeShapeListeners(node)
        // node.listening(false)
      } else if (node instanceof Konva.Group) {
        GroupPlugin.removeGroupListeners(context, node)
      }
    })

    return newGroup;
  }

  private static createBoundaryRect(context: IPluginContext, group: Konva.Group) {
    const boundary = new Konva.Rect({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      draggable: false,
      stroke: '#1e1e1e',
      dash: [11, 11],
      strokeWidth: 2,
      strokeScaleEnabled: false,
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
      const topLeft = group.getTransform().point({ x: box.x, y: box.y })
      const topRight = group.getTransform().point({
        x: box.x + box.width,
        y: box.y,
      })
      const bottomLeft = group.getTransform().point({
        x: box.x,
        y: box.y + box.height,
      })

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


  private static removeGroupListeners(context: IPluginContext, group: Konva.Group) {
    group
      .off('pointerclick')
      .off('pointerdown')
      .off('pointerup')
      .off('pointerdblclick')
      .off('dragstart')
      .off('dragmove')
      .off('dragend')
      .off('transformstart')
      .off('transformmove')
      .off('transformend')
  }

  private setupReaction(context: IPluginContext) {
    createEffect(() => {
      const markedToRemove = new Set(this.#boundaries.keys())
      context.state.selection.filter(sel => sel instanceof Konva.Group).forEach(group => {
        console.log('show', group)
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
  }

  private selectGroup(context: IPluginContext, group: Konva.Group) {
    const { getBoundaryBox, hide, node, show, update } = this.#boundaries.get(group.id()) ?? GroupPlugin.createBoundaryRect(context, group)
    this.#boundaries.set(group.id(), { getBoundaryBox, hide, node, show, update })
    if (node.getLayer() !== context.dynamicLayer) {
      context.dynamicLayer.add(node)
    }
    show()
  }

  setupGroupListeners(context: IPluginContext, group: Konva.Group) {
    // group.children.forEach(node => {
    //   node.on('pointerclick', e => {
    //     console.log('child', e)
    //   })
    // })
    group.on('pointerdblclick', e => {
      // console.log(e)
      // context.setState('selection', produce(sel => sel.push(e.target)))
    })
    group.on('pointerdown', e => {
      // this.selectGroup(context, group)
      // context.setState('selection', [group])
      context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERDOWN, e)
    })

    group.on('dragmove transform', e => {
      const boundary = this.#boundaries.get(group.id())
      if (!boundary) return
      boundary.update()
    })
  }



}
