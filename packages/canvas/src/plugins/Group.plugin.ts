import Konva from "konva";
import { CanvasMode } from "../services/canvas/enum";
import type { IPlugin, IPluginContext } from "./interface";
import { createEffect } from "solid-js";
import { produce } from "solid-js/store";
import type { TTool } from "../components/FloatingCanvasToolbar/toolbar.types";
import { CustomEvents } from "../custom-events";
import { TCanvasDoc, TElement, TElementData, TElementStyle, TRectData } from "@vibecanvas/shell/automerge/index";
import { Shape2dPlugin } from "./Shape2d.plugin";


export class GroupPlugin implements IPlugin {
  #boundaries: Map<string, { node: Konva.Rect, update: () => void, show: () => void, hide: () => void, getBoundaryBox: () => { x: number, y: number, width: number, height: number } }> = new Map()

  constructor() {

  }

  apply(context: IPluginContext): void {

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

    context.hooks.pointerDown.tap(e => {
      if (this.#boundaries.size === 0) return;
      this.#boundaries.forEach(b => b.node.destroy())
      this.#boundaries.clear()
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
        Shape2dPlugin.removeShapeListeners(node)
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
      stroke: '1e1e1e',
      dash: [11, 11],
      strokeWidth: 2,
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
      boundary.position(topLeft)
      boundary.rotation(group.rotation())
      boundary.scale(group.scale())
      boundary.size({ width: box.width, height: box.height })
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

  setupGroupListeners(context: IPluginContext, group: Konva.Group) {
    // group.children.forEach(node => {
    //   node.on('pointerclick', e => {
    //     console.log('child', e)
    //   })
    // })
    group.on('pointerclick pointerdown', e => {
      const { getBoundaryBox, hide, node, show, update } = this.#boundaries.get(group.id()) ?? GroupPlugin.createBoundaryRect(context, group)
      this.#boundaries.set(group.id(), { getBoundaryBox, hide, node, show, update })
      context.dynamicLayer.add(node)
      context.hooks.cameraChange.tap(update)
      show()
      context.setState('selection', [group])
      e.cancelBubble = true
    })

    group.on('dragmove transform', e => {
      const boundary = this.#boundaries.get(group.id())
      if (!boundary) return
      boundary.update()
    })
  }



}
