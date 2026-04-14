import type { TElement, TElementStyle } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import Konva from "konva";
import { fxGetAbsolutePositionFromWorldPosition, fxGetWorldPosition } from "../../core/fn.world-position";
import { fxGetCanvasParentGroupId, type TCanvasSemanticsEditor } from "../../core/fn.canvas-node-semantics";
import { fxGetNodeZIndex } from "../../core/fn.get-node-z-index";
import { setNodeZIndex } from "../../core/render-order";
import type { ThemeService } from "@vibecanvas/service-theme";
import { createShapeFromElement } from "./Shape1d.render";
import {
  DEFAULT_OPACITY,
  DEFAULT_STROKE,
  ELEMENT_CREATED_AT_ATTR,
  MIN_HIT_STROKE_WIDTH,
  type TPoint,
  type TShape1dData,
  type TShape1dNode,
  getColorStyleKey,
  getStrokeColorFromStyle,
  getStrokeWidthFromStyle,
  isSupportedElementType,
} from "./Shape1d.shared";

function createStyleFromNode(node: TShape1dNode, baseStyle: TElementStyle): TElementStyle {
  const style: TElementStyle = {
    ...structuredClone(baseStyle),
    opacity: node.opacity(),
    strokeWidth: node.strokeWidth(),
  };
  const colorStyleKey = getColorStyleKey(baseStyle);
  delete style.backgroundColor;
  delete style.strokeColor;

  const stroke = node.stroke();
  style[colorStyleKey] = typeof baseStyle[colorStyleKey] === "string"
    ? baseStyle[colorStyleKey]
    : (typeof stroke === "string" ? stroke : DEFAULT_STROKE);
  return style;
}

export function updateShapeFromElement(theme: ThemeService, node: TShape1dNode, element: TElement) {
  if (!isSupportedElementType(element.data.type)) {
    return;
  }

  const strokeWidth = getStrokeWidthFromStyle(element.style);
  const color = getStrokeColorFromStyle(theme, element.style);
  node.absolutePosition(fxGetAbsolutePositionFromWorldPosition({
    worldPosition: { x: element.x, y: element.y },
    parentTransform: node.getLayer()?.getAbsoluteTransform() ?? null,
  }));
  node.rotation(element.rotation);
  node.stroke(color);
  node.fill(color);
  node.strokeWidth(strokeWidth);
  node.hitStrokeWidth(Math.max(MIN_HIT_STROKE_WIDTH, strokeWidth + 8));
  node.opacity(element.style.opacity ?? DEFAULT_OPACITY);
  node.scale({ x: 1, y: 1 });
  node.setAttr(ELEMENT_CREATED_AT_ATTR, element.createdAt);
  node.setAttr("vcElementData", structuredClone(element.data));
  node.setAttr("vcElementStyle", structuredClone(element.style));
  setNodeZIndex(node, element.zIndex);
}

export function toTElement(editor: TCanvasSemanticsEditor, node: TShape1dNode): TElement {
  const baseData = structuredClone(node.getAttr("vcElementData") as TShape1dData | undefined);
  if (!baseData || !isSupportedElementType(baseData.type)) {
    throw new Error("Shape1d node is missing vcElementData metadata");
  }

  const baseStyle = structuredClone((node.getAttr("vcElementStyle") as TElementStyle | undefined) ?? {});
  const absoluteScale = node.getAbsoluteScale();
  const layer = node.getLayer();
  const scaleX = absoluteScale.x / (layer?.scaleX() ?? 1);
  const scaleY = absoluteScale.y / (layer?.scaleY() ?? 1);
  const { x, y } = fxGetWorldPosition({
    absolutePosition: node.absolutePosition(),
    parentTransform: node.getLayer()?.getAbsoluteTransform() ?? null,
  });
  const now = Date.now();

  return {
    id: node.id(),
    x,
    y,
    rotation: node.getAbsoluteRotation(),
    bindings: [],
    createdAt: Number(node.getAttr(ELEMENT_CREATED_AT_ATTR) ?? now),
    locked: false,
    parentGroupId: fxGetCanvasParentGroupId({ editor, node }),
    updatedAt: now,
    zIndex: fxGetNodeZIndex(node),
    data: {
      ...baseData,
      points: baseData.points.map(([px, py]) => [px * scaleX, py * scaleY] as TPoint),
    },
    style: createStyleFromNode(node, baseStyle),
  } satisfies TElement;
}

export function createPreviewClone(
  node: TShape1dNode,
  createId: () => string,
  now: () => number,
  theme: ThemeService,
) {
  const element = toTElement({ toGroup: () => null }, node);
  const timestamp = now();
  const clone = createShapeFromElement(theme, {
    ...element,
    id: createId(),
    parentGroupId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    data: structuredClone(element.data),
    style: structuredClone(element.style),
    zIndex: "",
  });

  clone.setDraggable(true);
  return clone;
}

export function safeStopDrag(node: Konva.Node) {
  try {
    if (node.isDragging()) {
      node.stopDrag();
    }
  } catch {
    return;
  }
}
