import type Konva from 'konva'
import type { Node, NodeConfig } from 'konva/lib/Node'
import { isKonvaGroup } from '../../core/GUARDS'
import { WIDGET_HOST_MINIMIZE_BUTTON_ID } from './CONSTANTS'

type TPortal = {
  node: Node<NodeConfig>
}
type TArgs = {
}

export function fxAttachWidgetListener(portal: TPortal, args: TArgs) {
  if(!isKonvaGroup(portal.node)) return

  // portal.node.off("pointerclick pointerdown dragstart pointerdblclick dragmove dragend");
  // portal.node.listening(false)
  const body = portal.node.findOne('#body') as Konva.Rect
  console.log(body)
  const header = portal.node.findOne('#header') as Konva.Rect
  const border = portal.node.findOne('#border') as Konva.Rect
  const divider = portal.node.findOne('#divider') as Konva.Rect
  divider.destroy()
  const minimizeButton = portal.node.findOne('#' + WIDGET_HOST_MINIMIZE_BUTTON_ID) as Konva.Circle
  console.log(minimizeButton)
  minimizeButton.on('pointerover pointerclick', (e) => {
    console.log('button pointerover', e)

  })

  header.on('pointerover pointerclick', (e) => {
    console.log('header pointerover', e)
  })
  // header.destroy()
  // border.destroy()


  portal.node.on('dragmove pointerdown pointerover', (e) => {
    // console.log(e)
  })
  body.on('dragmove pointerdown pointerover', (e) => {
    console.log('body dragmove pointerover', e)
    // e.cancelBubble = true;
  })
}
