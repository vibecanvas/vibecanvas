import Konva from "konva";
import { HOSTED_ELEMENT_ATTR, HOSTED_TYPE_ATTR, HOSTED_WIDGET_CLASS } from "./HostedSolidWidget.constants";
import type { THostedWidgetElement } from "./HostedSolidWidget.types";
import { getWorldPosition, setWorldPosition } from "../shared/node-space";
import { getNodeZIndex, setNodeZIndex } from "../shared/render-order.shared";
import { HOSTED_WIDGET_NODE_ATTR } from "../shared/hosted-widget.shared";
import { isHostedType } from "./HostedSolidWidget.helpers";

export function isHostedNode(node: Konva.Node | null | undefined): node is Konva.Rect {
  return node instanceof Konva.Rect && node.getAttr(HOSTED_WIDGET_NODE_ATTR) === true;
}

export function createHostedNode(element: THostedWidgetElement) {
  const node = new Konva.Rect({
    id: element.id,
    x: element.x,
    y: element.y,
    width: element.data.w,
    height: element.data.h,
    rotation: element.rotation,
    fill: "#000000",
    opacity: 0.001,
    listening: true,
    draggable: true,
    strokeEnabled: false,
  });

  node.name(HOSTED_WIDGET_CLASS);
  node.setAttr(HOSTED_WIDGET_NODE_ATTR, true);
  node.setAttr(HOSTED_TYPE_ATTR, element.data.type);
  node.setAttr(HOSTED_ELEMENT_ATTR, structuredClone(element));
  setNodeZIndex(node, element.zIndex);
  return node;
}

export function updateHostedNode(node: Konva.Rect, element: THostedWidgetElement) {
  node.width(element.data.w);
  node.height(element.data.h);
  node.rotation(element.rotation);
  node.scale({ x: 1, y: 1 });
  node.skew({ x: 0, y: 0 });
  setWorldPosition(node, { x: element.x, y: element.y });
  setNodeZIndex(node, element.zIndex);
  node.setAttr(HOSTED_ELEMENT_ATTR, structuredClone(element));
}

export function hostedNodeToElement(node: Konva.Rect): THostedWidgetElement {
  const snapshot = structuredClone(node.getAttr(HOSTED_ELEMENT_ATTR) as THostedWidgetElement | undefined);
  const widgetType = node.getAttr(HOSTED_TYPE_ATTR);
  const type = isHostedType(widgetType) ? widgetType : null;
  if (!snapshot || !type) {
    throw new Error("Missing hosted widget snapshot");
  }

  const worldPosition = getWorldPosition(node);
  const absoluteScale = node.getAbsoluteScale();
  const layer = node.getLayer();
  const layerScaleX = layer?.scaleX() ?? 1;
  const layerScaleY = layer?.scaleY() ?? 1;
  const parent = node.getParent();

  return {
    ...snapshot,
    x: worldPosition.x,
    y: worldPosition.y,
    rotation: node.getAbsoluteRotation(),
    parentGroupId: parent instanceof Konva.Group ? parent.id() : null,
    zIndex: getNodeZIndex(node),
    updatedAt: Date.now(),
    data: {
      ...snapshot.data,
      w: node.width() * (absoluteScale.x / layerScaleX),
      h: node.height() * (absoluteScale.y / layerScaleY),
    },
  } as THostedWidgetElement;
}
