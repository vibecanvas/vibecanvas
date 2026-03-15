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
          this.group(context)

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

  private group(context: IPluginContext) {

    const newGroup = new Konva.Group({
      draggable: true
    })
    context.state.selection.forEach(node => {
      newGroup.add(node)
      node.setDraggable(false)
      if (node instanceof Konva.Shape && Shape2dPlugin.supportedTypes.has(node.getAttr('backendData').data.type)) {
        Shape2dPlugin.removeShapeListeners(node)
      }
    })

    context.staticForegroundLayer.add(newGroup)
  }

  static setupGroupListeners(group: Konva.Group, context: IPluginContext) {
    group.on('pointerclick', e => {
      console.log(e)
    })
  }



}
