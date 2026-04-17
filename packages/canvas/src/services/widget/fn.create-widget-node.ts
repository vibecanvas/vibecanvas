import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from 'konva';
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
} from './CONSTANTS';
import { THostThemeColors } from "./types";


function createHeader(konva: typeof Konva, colors: THostThemeColors) {

  const header = new konva.Rect({
    id: WIDGET_HOST_HEADER_ID,
    x: 0,
    y: 0,
    width: WIDGET_HOST_MIN_WIDTH,
    height: WIDGET_HOST_HEADER_HEIGHT,
    fill: colors.headerFill,
    cornerRadius: [WIDGET_HOST_WINDOW_CORNER_RADIUS, WIDGET_HOST_WINDOW_CORNER_RADIUS, 0, 0],
  })

  const divider = new konva.Rect({
    id: WIDGET_HOST_DIVIDER_ID,
    x: WIDGET_HOST_WINDOW_STROKE_WIDTH,
    y: WIDGET_HOST_HEADER_HEIGHT - WIDGET_HOST_DIVIDER_HEIGHT,
    width: WIDGET_HOST_MIN_WIDTH - WIDGET_HOST_WINDOW_STROKE_WIDTH * 2,
    height: WIDGET_HOST_DIVIDER_HEIGHT,
    fill: colors.dividerFill,
  })

  const closeButton = new konva.Circle({
    id: WIDGET_HOST_CLOSE_BUTTON_ID,
    x: WIDGET_HOST_TRAFFIC_LIGHT_START_X,
    y: WIDGET_HOST_TRAFFIC_LIGHT_Y,
    radius: WIDGET_HOST_TRAFFIC_LIGHT_RADIUS,
    fill: colors.closeButtonFill,
    stroke: colors.trafficLightStroke,
    strokeWidth: 1,
  })

  const minimizeButton = new konva.Circle({
    id: WIDGET_HOST_MINIMIZE_BUTTON_ID,
    x: WIDGET_HOST_TRAFFIC_LIGHT_START_X + WIDGET_HOST_TRAFFIC_LIGHT_SPACING,
    y: WIDGET_HOST_TRAFFIC_LIGHT_Y,
    radius: WIDGET_HOST_TRAFFIC_LIGHT_RADIUS,
    fill: colors.minimizeButtonFill,
    stroke: colors.trafficLightStroke,
    strokeWidth: 1,
  })

  const maximizeButton = new konva.Circle({
    id: WIDGET_HOST_MAXIMIZE_BUTTON_ID,
    x: WIDGET_HOST_TRAFFIC_LIGHT_START_X + WIDGET_HOST_TRAFFIC_LIGHT_SPACING * 2,
    y: WIDGET_HOST_TRAFFIC_LIGHT_Y,
    radius: WIDGET_HOST_TRAFFIC_LIGHT_RADIUS,
    fill: colors.maximizeButtonFill,
    stroke: colors.trafficLightStroke,
    strokeWidth: 1,
  })

  const border = new konva.Rect({
    id: WIDGET_HOST_BORDER_ID,
    x: 0,
    y: 0,
    width: WIDGET_HOST_MIN_WIDTH,
    height: WIDGET_HOST_HEADER_HEIGHT,
    stroke: colors.windowStroke,
    strokeWidth: WIDGET_HOST_WINDOW_STROKE_WIDTH,
    cornerRadius: WIDGET_HOST_WINDOW_CORNER_RADIUS,
  })

  const headerGroup = new konva.Group({
    id: `${WIDGET_HOST_HEADER_ID}-group`,
  })
  headerGroup.add(header)
  headerGroup.add(divider)
  headerGroup.add(closeButton)
  headerGroup.add(minimizeButton)
  headerGroup.add(maximizeButton)
  headerGroup.add(border)

  return headerGroup
}

function createBody(konva: typeof Konva, colors: THostThemeColors) {
  const body = new konva.Rect({
    id: WIDGET_HOST_BODY_ID,
    x: 0,
    y: WIDGET_HOST_HEADER_HEIGHT,
    width: WIDGET_HOST_MIN_WIDTH,
    height: 0,
    fill: colors.bodyFill,
    cornerRadius: [0, 0, WIDGET_HOST_WINDOW_CORNER_RADIUS, WIDGET_HOST_WINDOW_CORNER_RADIUS],
  })

  return body;
}

export function fnCreateWidgetNode(konva: typeof Konva, colors: THostThemeColors, element: TElement) {
  if(element.data.type !== 'widget') return null

  const group = new konva.Group({
    x: element.x,
    y: element.y,
    width: WIDGET_HOST_MIN_WIDTH,
    height: WIDGET_HOST_HEADER_HEIGHT,
  })

  const body = createBody(konva, colors)
  const header = createHeader(konva, colors)


  group.add(body)
  group.add(header)
  // --- DRAW END, ATTACH ATTRIBUTES
  group.setAttr(WIDGET_HOST_ELEMENT_DATA_ATTR, element.data)
  group.setAttr(WIDGET_HOST_ELEMENT_STYLE_ATTR, {}) // style is fixed. no need for customization

  return group
}
