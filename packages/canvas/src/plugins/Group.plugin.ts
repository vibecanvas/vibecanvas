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
  #boundaries: Konva.Rect[] = [];

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
          GroupPlugin.group(context, context.state.selection)

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

    const newGroup = new Konva.Group({
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

    GroupPlugin.setupGroupListeners(context, newGroup)
    context.staticForegroundLayer.add(newGroup)
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

  private static setupGroupListeners(context: IPluginContext, group: Konva.Group) {
    // group.children.forEach(node => {
    //   node.on('pointerclick', e => {
    //     console.log('child', e)
    //   })
    // })
    group.on('pointerclick', e => {
      console.log(e)
      context.setState('selection', [group])
    })
  }



}
