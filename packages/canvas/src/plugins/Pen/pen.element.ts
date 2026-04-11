import type { TElement, TElementStyle, TPenData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import Konva from "konva";
import { getWorldPosition, setWorldPosition } from "../shared/node-space";
import { getNodeZIndex, setNodeZIndex } from "../shared/render-order.shared";
import { getStrokePathFromPenData, scalePenDataPoints } from "../shared/pen.math";
import { DEFAULT_FILL, DEFAULT_OPACITY, DEFAULT_STROKE_WIDTH } from "./pen.constants";

export function getPenStrokeWidthFromStyle(style: TElementStyle) {
  return style.strokeWidth ?? DEFAULT_STROKE_WIDTH;
}

export function getPenFillFromStyle(style: TElementStyle) {
  return style.backgroundColor ?? style.strokeColor ?? DEFAULT_FILL;
}

export function getPenColorStyleKey(style: TElementStyle): "backgroundColor" | "strokeColor" {
  if (typeof style.strokeColor === "string" && typeof style.backgroundColor !== "string") {
    return "strokeColor";
  }

  return "backgroundColor";
}

export function isPenPath(node: Konva.Path) {
  const data = node.getAttr("vcElementData") as TPenData | undefined;
  return data?.type === "pen";
}

export function isPenNode(node: Konva.Node): node is Konva.Path {
  return node instanceof Konva.Path && isPenPath(node);
}

export function createPenStyleFromNode(node: Konva.Path, baseStyle: TElementStyle): TElementStyle {
  const nodeFill = node.fill();
  const fill = typeof nodeFill === "string" ? nodeFill : DEFAULT_FILL;
  const style: TElementStyle = {
    ...structuredClone(baseStyle),
    opacity: node.opacity(),
    strokeWidth: node.getAttr("vcPenStrokeWidth") ?? DEFAULT_STROKE_WIDTH,
  };

  const colorStyleKey = getPenColorStyleKey(baseStyle);
  delete style.backgroundColor;
  delete style.strokeColor;
  style[colorStyleKey] = fill;

  return style;
}

export function createPenPathFromElement(element: TElement): Konva.Path {
  if (element.data.type !== "pen") {
    throw new Error("Unsupported element type for PenPlugin");
  }

  const node = new Konva.Path({
    id: element.id,
    x: element.x,
    y: element.y,
    rotation: element.rotation,
    data: getStrokePathFromPenData(element, {
      size: getPenStrokeWidthFromStyle(element.style),
    }),
    fill: getPenFillFromStyle(element.style),
    opacity: element.style.opacity ?? DEFAULT_OPACITY,
    listening: true,
    draggable: false,
  });

  node.setAttr("vcElementData", structuredClone(element.data));
  node.setAttr("vcElementStyle", structuredClone(element.style));
  node.setAttr("vcPenStrokeWidth", getPenStrokeWidthFromStyle(element.style));
  setNodeZIndex(node, element.zIndex);
  return node;
}

export function updatePenPathFromElement(node: Konva.Path, element: TElement) {
  if (element.data.type !== "pen") return;

  node.id(element.id);
  setWorldPosition(node, { x: element.x, y: element.y });
  node.rotation(element.rotation);
  node.data(getStrokePathFromPenData(element, {
    size: getPenStrokeWidthFromStyle(element.style),
  }));
  node.fill(getPenFillFromStyle(element.style));
  node.opacity(element.style.opacity ?? DEFAULT_OPACITY);
  node.scale({ x: 1, y: 1 });
  node.setAttr("vcElementData", structuredClone(element.data));
  node.setAttr("vcElementStyle", structuredClone(element.style));
  node.setAttr("vcPenStrokeWidth", getPenStrokeWidthFromStyle(element.style));
  setNodeZIndex(node, element.zIndex);
}

export function penPathToElement(node: Konva.Path): TElement {
  const baseData = structuredClone(node.getAttr("vcElementData") as TPenData | undefined);
  if (!baseData || baseData.type !== "pen") {
    throw new Error("Pen path is missing vcElementData metadata");
  }

  const baseStyle = structuredClone((node.getAttr("vcElementStyle") as TElementStyle | undefined) ?? {});
  const absoluteScale = node.getAbsoluteScale();
  const layer = node.getLayer();
  const layerScaleX = layer?.scaleX() ?? 1;
  const layerScaleY = layer?.scaleY() ?? 1;
  const scaleX = absoluteScale.x / layerScaleX;
  const scaleY = absoluteScale.y / layerScaleY;
  const worldPosition = getWorldPosition(node);
  const parent = node.getParent();
  const parentGroupId = parent instanceof Konva.Group ? parent.id() : null;

  return {
    id: node.id(),
    rotation: node.getAbsoluteRotation(),
    x: worldPosition.x,
    y: worldPosition.y,
    bindings: [],
    createdAt: Date.now(),
    locked: false,
    parentGroupId,
    updatedAt: Date.now(),
    zIndex: getNodeZIndex(node),
    data: {
      ...baseData,
      points: scalePenDataPoints(baseData.points, scaleX, scaleY),
    },
    style: createPenStyleFromNode(node, baseStyle),
  };
}
