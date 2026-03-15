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
    selections.forEach(node => {
      newGroup.add(node)
      node.setDraggable(false)
      if (node instanceof Konva.Shape && Shape2dPlugin.supportedTypes.has(node.getAttr('backendData').data.type)) {
        Shape2dPlugin.removeShapeListeners(node)
      } else if (node instanceof Konva.Group) {
        GroupPlugin.removeGroupListeners(context, node)
      }
    })

    context.staticForegroundLayer.add(newGroup)

    return newGroup;
  }

  private static createBoundaryRect(stage: Konva.Stage, group: Konva.Group) {
    const boundary = new Konva.Rect({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      draggable: false,
      stroke: 'pink',
      strokeWidth: 2,
      listening: false,
      visible: false,
      name: 'group-boundary:' + group.id(),
    })

    const getBoundaryBox = () => {
      const invTransform = stage.getAbsoluteTransform().copy().invert()
      const groupRect = group.getClientRect()

      const p1 = invTransform.point({
        x: groupRect.x,
        y: groupRect.y,
      })

      const p2 = invTransform.point({
        x: groupRect.x + groupRect.width,
        y: groupRect.y + groupRect.height,
      })

      return {
        x: p1.x,
        y: p1.y,
        width: p2.x - p1.x,
        height: p2.y - p1.y,
      }
    }

    const update = () => {
      const box = getBoundaryBox()
      boundary.position({ x: box.x, y: box.y })
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
    group.on('pointerclick', e => {
      const { getBoundaryBox, hide, node, show, update } = this.#boundaries.get(group.id()) ?? GroupPlugin.createBoundaryRect(context.stage, group)
      this.#boundaries.set(group.id(), { getBoundaryBox, hide, node, show, update })
      context.dynamicLayer.add(node)
      show()
      context.setState('selection', [group])
    })
  }



}
