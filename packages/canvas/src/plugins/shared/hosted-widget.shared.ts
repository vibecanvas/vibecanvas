import Konva from "konva";
import type { IPluginContext } from "./interface";
import { getNodeZIndex } from "./render-order.shared";

export const HOSTED_WIDGET_NODE_ATTR = "vcHostedWidget";
export const HOSTED_WIDGET_TRANSFORMER_VISIBLE_ATTR = "vcHostedTransformerVisible";

type TScreenPoint = {
  x: number;
  y: number;
};

export type THostedWidgetScreenBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zoom: number;
};

export function getHostedWidgetScreenBounds(node: Konva.Rect): THostedWidgetScreenBounds {
  const width = node.width();
  const height = node.height();
  const absoluteTransform = node.getAbsoluteTransform().copy();
  const topLeft = absoluteTransform.point({ x: 0, y: 0 });
  const topRight = absoluteTransform.point({ x: width, y: 0 });
  const bottomLeft = absoluteTransform.point({ x: 0, y: height });
  const widthScreen = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y);
  const heightScreen = Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y);
  const rotation = Math.atan2(topRight.y - topLeft.y, topRight.x - topLeft.x) * 180 / Math.PI;
  const zoom = node.getLayer()?.scaleX() ?? 1;

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: widthScreen / (zoom || 1),
    height: heightScreen / (zoom || 1),
    rotation,
    zoom,
  };
}

export function getHostedWidgetPointerWorldPoint(context: IPluginContext, point: TScreenPoint) {
  const containerRect = context.stage.container().getBoundingClientRect();
  const inverted = context.staticForegroundLayer.getAbsoluteTransform().copy().invert();

  return inverted.point({
    x: point.x - containerRect.left,
    y: point.y - containerRect.top,
  });
}

export function collectHostedWidgetSelectionShapes(roots: Array<Konva.Group | Konva.Shape>) {
  const shapes: Konva.Shape[] = [];
  const seen = new Set<string>();

  const visit = (node: Konva.Group | Konva.Shape) => {
    if (seen.has(node.id())) return;
    seen.add(node.id());

    if (node instanceof Konva.Group) {
      node.getChildren().forEach((child) => {
        if (child instanceof Konva.Group || child instanceof Konva.Shape) {
          visit(child);
        }
      });
      return;
    }

    shapes.push(node);
  };

  roots.forEach(visit);
  return shapes;
}

export function getHostedWidgetOrderKey(node: Konva.Node) {
  const parts: string[] = [];
  let current: Konva.Node | null = node;

  while (current) {
    if (current instanceof Konva.Group || current instanceof Konva.Shape) {
      parts.push(`${getNodeZIndex(current)}:${current.id()}`);
    }
    current = current.getParent();
  }

  return parts.reverse().join("/");
}
