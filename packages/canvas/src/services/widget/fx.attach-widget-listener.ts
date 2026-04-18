import type Konva from 'konva'
import type { Node, NodeConfig } from 'konva/lib/Node'
import { isKonvaCircle, isKonvaGroup } from '../../core/GUARDS'
import {
  WIDGET_HOST_CLOSE_BUTTON_ID,
  WIDGET_HOST_MAXIMIZE_BUTTON_ID,
  WIDGET_HOST_MINIMIZE_BUTTON_ID,
} from './CONSTANTS'

type TPortal = {
  node: Node<NodeConfig>
}
type TArgs = {
}

function toHoverFill(fill: string) {
  return `${fill}cc`
}

export function fxAttachWidgetListener(portal: TPortal, args: TArgs) {
  void args
  if(!isKonvaGroup(portal.node)) return

  const setCursor = (cursor: string) => {
    const stage = portal.node.getStage()
    if (stage) {
      stage.container().style.cursor = cursor
    }
  }

  const header = portal.node.findOne('#header')
  if (header) {
    header.off('pointerover pointerout pointerdown pointerup dragstart dragend')
    header.on('pointerover', () => {
      setCursor('grab')
    })
    header.on('pointerout', () => {
      setCursor('default')
    })
    header.on('pointerdown dragstart', () => {
      setCursor('grabbing')
    })
    header.on('pointerup dragend', () => {
      setCursor('grab')
    })
  }

  portal.node.off('dragend')
  portal.node.on('dragend', () => {
    setCursor('grab')
  })

  const buttonIds = [
    WIDGET_HOST_CLOSE_BUTTON_ID,
    WIDGET_HOST_MINIMIZE_BUTTON_ID,
    WIDGET_HOST_MAXIMIZE_BUTTON_ID,
  ]

  buttonIds.forEach((buttonId) => {
    const button = portal.node.findOne(`#${buttonId}`)
    if (!isKonvaCircle(button)) {
      return
    }

    const baseFill = button.fill()
    const hoverFill = toHoverFill(baseFill)

    button.off('pointerover pointerout pointerdown pointerup pointerclick')
    button.on('pointerover', (event) => {
      event.cancelBubble = true
      button.fill(hoverFill)
      setCursor('pointer')
      button.getLayer()?.batchDraw()
    })
    button.on('pointerout', (event) => {
      event.cancelBubble = true
      button.fill(baseFill)
      setCursor('default')
      button.getLayer()?.batchDraw()
    })
    button.on('pointerdown pointerup pointerclick', (event) => {
      event.cancelBubble = true
      setCursor('pointer')
    })
  })
}
