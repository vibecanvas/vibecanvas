import type { TWidgetData } from '@vibecanvas/service-automerge/types/canvas-doc.types'
import type Konva from 'konva'
import type { Node, NodeConfig } from 'konva/lib/Node'
import { isKonvaCircle, isKonvaGroup, isKonvaRect } from '../../core/GUARDS'
import {
  WIDGET_HOST_BODY_ID,
  WIDGET_HOST_BORDER_ID,
  WIDGET_HOST_CLOSE_BUTTON_ID,
  WIDGET_HOST_DIVIDER_ID,
  WIDGET_HOST_ELEMENT_DATA_ATTR,
  WIDGET_HOST_HEADER_HEIGHT,
  WIDGET_HOST_HEADER_ID,
  WIDGET_HOST_MAXIMIZE_BUTTON_ID,
  WIDGET_HOST_MINIMIZE_BUTTON_ID,
  WIDGET_HOST_WINDOW_CORNER_RADIUS,
} from './CONSTANTS'

type TPortal = {
  node: Node<NodeConfig>
}
type TArgs = {
}

function toHoverFill(fill: string | CanvasGradient) {
  return `${fill}cc`
}

function setupButtons(args: {
  node: Konva.Group;
  setCursor: (cursor: string) => void;
  syncExpandedState: (expanded: boolean) => void;
}) {
  const buttonIds = [
    WIDGET_HOST_CLOSE_BUTTON_ID,
    WIDGET_HOST_MINIMIZE_BUTTON_ID,
    WIDGET_HOST_MAXIMIZE_BUTTON_ID,
  ]

  buttonIds.forEach((buttonId) => {
    const button = args.node.findOne(`#${buttonId}`)
    if (!isKonvaCircle(button)) {
      return
    }

    const baseFill = button.fill()
    const hoverFill = toHoverFill(baseFill)

    button.off('pointerover pointerout pointerdown pointerup pointerclick')
    button.on('pointerover', (event) => {
      event.cancelBubble = true
      button.fill(hoverFill)
      args.setCursor('pointer')
      button.getLayer()?.batchDraw()
    })
    button.on('pointerout', (event) => {
      event.cancelBubble = true
      button.fill(baseFill)
      args.setCursor('default')
      button.getLayer()?.batchDraw()
    })
    button.on('pointerdown pointerup', (event) => {
      event.cancelBubble = true
      args.setCursor('pointer')
    })
    button.on('pointerclick', (event) => {
      event.cancelBubble = true
      args.setCursor('pointer')
      if (buttonId === WIDGET_HOST_MINIMIZE_BUTTON_ID) {
        const widgetData = args.node.getAttr(WIDGET_HOST_ELEMENT_DATA_ATTR) as TWidgetData | undefined
        const nextExpanded = widgetData?.type === 'widget'
          ? widgetData.expanded === false
          : false
        args.syncExpandedState(nextExpanded)
      }
    })
  })
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

  const syncExpandedState = (expanded: boolean) => {
    if (!isKonvaGroup(portal.node)) return
    const body = portal.node.findOne(`#${WIDGET_HOST_BODY_ID}`)
    if (isKonvaRect(body)) {
      body.visible(expanded)
      body.listening(expanded)
    }

    const border = portal.node.findOne(`#${WIDGET_HOST_BORDER_ID}`)
    if (isKonvaRect(border)) {
      border.height(expanded ? portal.node.height() : WIDGET_HOST_HEADER_HEIGHT)
    }

    const divider = portal.node.findOne(`#${WIDGET_HOST_DIVIDER_ID}`)
    if (isKonvaRect(divider)) {
      divider.visible(expanded)
      divider.listening(false)
    }

    const header = portal.node.findOne(`#${WIDGET_HOST_HEADER_ID}`)
    if (isKonvaRect(header)) {
      header.cornerRadius([WIDGET_HOST_WINDOW_CORNER_RADIUS, WIDGET_HOST_WINDOW_CORNER_RADIUS, 0, 0])
    }

    const widgetData = portal.node.getAttr(WIDGET_HOST_ELEMENT_DATA_ATTR) as TWidgetData | undefined
    if (widgetData?.type === 'widget') {
      portal.node.setAttr(WIDGET_HOST_ELEMENT_DATA_ATTR, {
        ...widgetData,
        expanded,
      } satisfies TWidgetData)
    }

    portal.node.getLayer()?.batchDraw()
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

  setupButtons({
    node: portal.node,
    setCursor,
    syncExpandedState,
  })
}
