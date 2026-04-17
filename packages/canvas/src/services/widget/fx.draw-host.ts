import type { TElementData } from '@vibecanvas/service-automerge/types/canvas-doc.types'
import type { ThemeService } from '@vibecanvas/service-theme'
import type Konva from 'konva'
import type { TEditorToolDrawCreateStartDraftArgs, TEditorToolDrawCreateUpdateDraftArgs } from '../editor/EditorService'
import {
  WIDGET_HOST_BODY_ID,
  WIDGET_HOST_BORDER_ID,
  WIDGET_HOST_CLOSE_BUTTON_ID,
  WIDGET_HOST_DIVIDER_HEIGHT,
  WIDGET_HOST_DIVIDER_ID,
  WIDGET_HOST_ELEMENT_DATA_ATTR,
  WIDGET_HOST_ELEMENT_STYLE_ATTR,
  WIDGET_HOST_HEADER_HEIGHT,
  WIDGET_HOST_HEADER_ID,
  WIDGET_HOST_MAXIMIZE_BUTTON_ID,
  WIDGET_HOST_MINIMIZE_BUTTON_ID,
  WIDGET_HOST_MIN_WIDTH,
  WIDGET_HOST_TRAFFIC_LIGHT_RADIUS,
  WIDGET_HOST_TRAFFIC_LIGHT_SPACING,
  WIDGET_HOST_TRAFFIC_LIGHT_START_X,
  WIDGET_HOST_TRAFFIC_LIGHT_Y,
  WIDGET_HOST_WINDOW_CORNER_RADIUS,
  WIDGET_HOST_WINDOW_STROKE_WIDTH,
} from './CONSTANTS'

type THostThemeColors = {
  headerFill: string;
  bodyFill: string;
  dividerFill: string;
  windowStroke: string;
  trafficLightStroke: string;
  closeButtonFill: string;
  minimizeButtonFill: string;
  maximizeButtonFill: string;
}

function getHostThemeColors(themeService: ThemeService): THostThemeColors {
  const colors = themeService.getTheme().colors

  return {
    headerFill: colors.muted,
    bodyFill: colors.card,
    dividerFill: colors.border,
    windowStroke: colors.border,
    trafficLightStroke: colors.border,
    closeButtonFill: colors.destructive,
    minimizeButtonFill: colors.warning,
    maximizeButtonFill: colors.success,
  }
}

type TPortalUpdateHost = {
  konva: typeof Konva;
  group: Konva.Group;
  themeService: ThemeService;
}

type TArgsUpdateHost = TEditorToolDrawCreateUpdateDraftArgs

export function fxUpdateHost(portal: TPortalUpdateHost, args: TArgsUpdateHost) {
  const border = portal.group.findOne(`#${WIDGET_HOST_BORDER_ID}`)
  const header = portal.group.findOne(`#${WIDGET_HOST_HEADER_ID}`)
  const body = portal.group.findOne(`#${WIDGET_HOST_BODY_ID}`)
  const divider = portal.group.findOne(`#${WIDGET_HOST_DIVIDER_ID}`)
  const closeButton = portal.group.findOne(`#${WIDGET_HOST_CLOSE_BUTTON_ID}`)
  const minimizeButton = portal.group.findOne(`#${WIDGET_HOST_MINIMIZE_BUTTON_ID}`)
  const maximizeButton = portal.group.findOne(`#${WIDGET_HOST_MAXIMIZE_BUTTON_ID}`)
  if (!(body instanceof portal.konva.Rect)) return
  if (!(header instanceof portal.konva.Rect)) return

  const hostThemeColors = getHostThemeColors(portal.themeService)
  const width = Math.max(WIDGET_HOST_MIN_WIDTH, args.point.x - portal.group.x())
  const height = Math.max(WIDGET_HOST_HEADER_HEIGHT, args.point.y - portal.group.y())
  const bodyHeight = Math.max(0, height - WIDGET_HOST_HEADER_HEIGHT)
  const dividerWidth = Math.max(0, width - WIDGET_HOST_WINDOW_STROKE_WIDTH * 2)

  portal.group.width(width)
  portal.group.height(WIDGET_HOST_HEADER_HEIGHT + bodyHeight)

  if (border instanceof portal.konva.Rect) {
    border.width(width)
    border.height(WIDGET_HOST_HEADER_HEIGHT + bodyHeight)
    border.stroke(hostThemeColors.windowStroke)
  }

  header.width(width)
  header.height(WIDGET_HOST_HEADER_HEIGHT)
  header.fill(hostThemeColors.headerFill)

  if (divider instanceof portal.konva.Rect) {
    divider.x(WIDGET_HOST_WINDOW_STROKE_WIDTH)
    divider.y(WIDGET_HOST_HEADER_HEIGHT - WIDGET_HOST_DIVIDER_HEIGHT)
    divider.width(dividerWidth)
    divider.height(WIDGET_HOST_DIVIDER_HEIGHT)
    divider.fill(hostThemeColors.dividerFill)
  }

  body.y(WIDGET_HOST_HEADER_HEIGHT)
  body.width(width)
  body.height(bodyHeight)
  body.fill(hostThemeColors.bodyFill)

  if (closeButton instanceof portal.konva.Circle) {
    closeButton.fill(hostThemeColors.closeButtonFill)
    closeButton.stroke(hostThemeColors.trafficLightStroke)
  }

  if (minimizeButton instanceof portal.konva.Circle) {
    minimizeButton.fill(hostThemeColors.minimizeButtonFill)
    minimizeButton.stroke(hostThemeColors.trafficLightStroke)
  }

  if (maximizeButton instanceof portal.konva.Circle) {
    maximizeButton.fill(hostThemeColors.maximizeButtonFill)
    maximizeButton.stroke(hostThemeColors.trafficLightStroke)
  }
}

type TPortalCreateHost = {
  konva: typeof Konva;
  themeService: ThemeService;
}

type TArgsCreateHost = { kind: string, initialPayload: Record<string, any> } & TEditorToolDrawCreateStartDraftArgs

export function fxDrawHost(portal: TPortalCreateHost, args: TArgsCreateHost) {
  const hostThemeColors = getHostThemeColors(portal.themeService)
  const group = new portal.konva.Group({
    x: args.point.x,
    y: args.point.y,
    width: WIDGET_HOST_MIN_WIDTH,
    height: WIDGET_HOST_HEADER_HEIGHT,
  })

  const body = new portal.konva.Rect({
    id: WIDGET_HOST_BODY_ID,
    x: 0,
    y: WIDGET_HOST_HEADER_HEIGHT,
    width: WIDGET_HOST_MIN_WIDTH,
    height: 0,
    fill: hostThemeColors.bodyFill,
    cornerRadius: [0, 0, WIDGET_HOST_WINDOW_CORNER_RADIUS, WIDGET_HOST_WINDOW_CORNER_RADIUS],
  })

  const header = new portal.konva.Rect({
    id: WIDGET_HOST_HEADER_ID,
    x: 0,
    y: 0,
    width: WIDGET_HOST_MIN_WIDTH,
    height: WIDGET_HOST_HEADER_HEIGHT,
    fill: hostThemeColors.headerFill,
    cornerRadius: [WIDGET_HOST_WINDOW_CORNER_RADIUS, WIDGET_HOST_WINDOW_CORNER_RADIUS, 0, 0],
  })

  const divider = new portal.konva.Rect({
    id: WIDGET_HOST_DIVIDER_ID,
    x: WIDGET_HOST_WINDOW_STROKE_WIDTH,
    y: WIDGET_HOST_HEADER_HEIGHT - WIDGET_HOST_DIVIDER_HEIGHT,
    width: WIDGET_HOST_MIN_WIDTH - WIDGET_HOST_WINDOW_STROKE_WIDTH * 2,
    height: WIDGET_HOST_DIVIDER_HEIGHT,
    fill: hostThemeColors.dividerFill,
  })

  const closeButton = new portal.konva.Circle({
    id: WIDGET_HOST_CLOSE_BUTTON_ID,
    x: WIDGET_HOST_TRAFFIC_LIGHT_START_X,
    y: WIDGET_HOST_TRAFFIC_LIGHT_Y,
    radius: WIDGET_HOST_TRAFFIC_LIGHT_RADIUS,
    fill: hostThemeColors.closeButtonFill,
    stroke: hostThemeColors.trafficLightStroke,
    strokeWidth: 1,
  })

  const minimizeButton = new portal.konva.Circle({
    id: WIDGET_HOST_MINIMIZE_BUTTON_ID,
    x: WIDGET_HOST_TRAFFIC_LIGHT_START_X + WIDGET_HOST_TRAFFIC_LIGHT_SPACING,
    y: WIDGET_HOST_TRAFFIC_LIGHT_Y,
    radius: WIDGET_HOST_TRAFFIC_LIGHT_RADIUS,
    fill: hostThemeColors.minimizeButtonFill,
    stroke: hostThemeColors.trafficLightStroke,
    strokeWidth: 1,
  })

  const maximizeButton = new portal.konva.Circle({
    id: WIDGET_HOST_MAXIMIZE_BUTTON_ID,
    x: WIDGET_HOST_TRAFFIC_LIGHT_START_X + WIDGET_HOST_TRAFFIC_LIGHT_SPACING * 2,
    y: WIDGET_HOST_TRAFFIC_LIGHT_Y,
    radius: WIDGET_HOST_TRAFFIC_LIGHT_RADIUS,
    fill: hostThemeColors.maximizeButtonFill,
    stroke: hostThemeColors.trafficLightStroke,
    strokeWidth: 1,
  })

  const border = new portal.konva.Rect({
    id: WIDGET_HOST_BORDER_ID,
    x: 0,
    y: 0,
    width: WIDGET_HOST_MIN_WIDTH,
    height: WIDGET_HOST_HEADER_HEIGHT,
    stroke: hostThemeColors.windowStroke,
    strokeWidth: WIDGET_HOST_WINDOW_STROKE_WIDTH,
    cornerRadius: WIDGET_HOST_WINDOW_CORNER_RADIUS,
  })

  group.add(body)
  group.add(header)
  group.add(divider)
  group.add(closeButton)
  group.add(minimizeButton)
  group.add(maximizeButton)
  group.add(border)

  const elementData: TElementData = {
    type: 'widget',
    expanded: false,
    kind: args.kind,
    window: 'contained',
    h: WIDGET_HOST_HEADER_HEIGHT,
    w: WIDGET_HOST_MIN_WIDTH,
    payload: args.initialPayload
  }

  group.setAttr(WIDGET_HOST_ELEMENT_DATA_ATTR, elementData)
  group.setAttr(WIDGET_HOST_ELEMENT_STYLE_ATTR, {}) // style is fixed. no need for customization

  return group
}
