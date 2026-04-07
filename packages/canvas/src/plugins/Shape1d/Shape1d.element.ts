import type { TElement, TElementStyle } from "@vibecanvas/service-automerge/types/canvas-doc";
import Konva from "konva";
import { getWorldPosition, setWorldPosition } from "../shared/node-space";
import { getNodeZIndex, setNodeZIndex } from "../shared/render-order.shared";
import { createShapeFromElement } from "./Shape1d.render";
import { DEFAULT_OPACITY, DEFAULT_STROKE, MIN_HIT_STROKE_WIDTH, type TPoint, type TShape1dData, type TShape1dNode, getColorStyleKey, getStrokeColorFromStyle, getStrokeWidthFromStyle, isSupportedElementType } from "./Shape1d.shared";

function createStyleFromNode(node: TShape1dNode, baseStyle: TElementStyle): TElementStyle {
  const style: TElementStyle = { ...structuredClone(baseStyle), opacity: node.opacity(), strokeWidth: node.strokeWidth() };
  const colorStyleKey = getColorStyleKey(baseStyle);
  delete style.backgroundColor;
  delete style.strokeColor;
  const stroke = node.stroke();
  style[colorStyleKey] = typeof stroke === "string" ? stroke : DEFAULT_STROKE;
  return style;
}

export function updateShapeFromElement(node: TShape1dNode, element: TElement) {
  if (!isSupportedElementType(element.data.type)) return;
  const strokeWidth = getStrokeWidthFromStyle(element.style);
  const color = getStrokeColorFromStyle(element.style);
  setWorldPosition(node, { x: element.x, y: element.y });
  node.rotation(element.rotation);
  node.stroke(color);
  node.fill(color);
  node.strokeWidth(strokeWidth);
  node.hitStrokeWidth(Math.max(MIN_HIT_STROKE_WIDTH, strokeWidth + 8));
  node.opacity(element.style.opacity ?? DEFAULT_OPACITY);
  node.scale({ x: 1, y: 1 });
  node.setAttr("vcElementData", structuredClone(element.data));
  node.setAttr("vcElementStyle", structuredClone(element.style));
  setNodeZIndex(node, element.zIndex);
}

export function toTElement(node: TShape1dNode): TElement {
  const baseData = structuredClone(node.getAttr("vcElementData") as TShape1dData | undefined);
  if (!baseData || !isSupportedElementType(baseData.type)) throw new Error("Shape1d node is missing vcElementData metadata");
  const baseStyle = structuredClone((node.getAttr("vcElementStyle") as TElementStyle | undefined) ?? {});
  const absoluteScale = node.getAbsoluteScale();
  const layer = node.getLayer();
  const scaleX = absoluteScale.x / (layer?.scaleX() ?? 1);
  const scaleY = absoluteScale.y / (layer?.scaleY() ?? 1);
  const { x, y } = getWorldPosition(node);
  const parent = node.getParent();
  return { id: node.id(), x, y, rotation: node.getAbsoluteRotation(), bindings: [], createdAt: Date.now(), locked: false, parentGroupId: parent instanceof Konva.Group ? parent.id() : null, updatedAt: Date.now(), zIndex: getNodeZIndex(node), data: { ...baseData, points: baseData.points.map(([px, py]) => [px * scaleX, py * scaleY] as TPoint) }, style: createStyleFromNode(node, baseStyle) };
}

export function createPreviewClone(node: TShape1dNode) {
  const element = toTElement(node);
  const clone = createShapeFromElement({ ...element, id: crypto.randomUUID(), parentGroupId: null, data: structuredClone(element.data), style: structuredClone(element.style) });
  clone.setDraggable(true);
  return clone;
}

export function safeStopDrag(node: Konva.Node) {
  try {
    if (node.isDragging()) node.stopDrag();
  } catch {
    return;
  }
}
