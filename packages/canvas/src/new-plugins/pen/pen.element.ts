import type { TElement, TElementStyle, TPenData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type { RenderService } from "../../new-services/render/RenderService";
import { resolveThemeColor, type ThemeService } from "@vibecanvas/service-theme";
import Konva from "konva";
import { fxGetAbsolutePositionFromWorldPosition, fxGetWorldPosition } from "../../core/fn.world-position";
import { fxGetNodeZIndex } from "../../core/fn.get-node-z-index";
import { setNodeZIndex } from "../../core/render-order";
import { getStrokePathFromPenData, scalePenDataPoints } from "./pen.math";
import { DEFAULT_FILL, DEFAULT_OPACITY, DEFAULT_STROKE_WIDTH } from "./pen.constants";

const ELEMENT_DATA_ATTR = "vcElementData";
const ELEMENT_STYLE_ATTR = "vcElementStyle";
const PEN_STROKE_WIDTH_ATTR = "vcPenStrokeWidth";
const ELEMENT_CREATED_AT_ATTR = "vcElementCreatedAt";

export function getPenStrokeWidthFromStyle(style: TElementStyle) {
  return style.strokeWidth ?? DEFAULT_STROKE_WIDTH;
}

export function getPenFillFromStyle(theme: ThemeService, style: TElementStyle) {
  const rawFill = style.backgroundColor ?? style.strokeColor;
  return resolveThemeColor(theme.getTheme(), rawFill, DEFAULT_FILL) ?? DEFAULT_FILL;
}

export function getPenColorStyleKey(style: TElementStyle): "backgroundColor" | "strokeColor" {
  if (typeof style.strokeColor === "string" && typeof style.backgroundColor !== "string") {
    return "strokeColor";
  }

  return "backgroundColor";
}

export function isPenPath(node: Konva.Path) {
  const data = node.getAttr(ELEMENT_DATA_ATTR) as TPenData | undefined;
  return data?.type === "pen";
}

export function isPenNode(node: Konva.Node): node is Konva.Path {
  return node instanceof Konva.Path && isPenPath(node);
}

function createPenStyleFromNode(node: Konva.Path, baseStyle: TElementStyle): TElementStyle {
  const nodeFill = node.fill();
  const fill = typeof nodeFill === "string" ? nodeFill : DEFAULT_FILL;
  const style: TElementStyle = {
    ...structuredClone(baseStyle),
    opacity: node.opacity(),
    strokeWidth: node.getAttr(PEN_STROKE_WIDTH_ATTR) ?? DEFAULT_STROKE_WIDTH,
  };

  const colorStyleKey = getPenColorStyleKey(baseStyle);
  delete style.backgroundColor;
  delete style.strokeColor;
  style[colorStyleKey] = typeof baseStyle[colorStyleKey] === "string" ? baseStyle[colorStyleKey] : fill;

  return style;
}

function syncPenMetadata(node: Konva.Path, element: TElement) {
  node.setAttr(ELEMENT_DATA_ATTR, structuredClone(element.data));
  node.setAttr(ELEMENT_STYLE_ATTR, structuredClone(element.style));
  node.setAttr(PEN_STROKE_WIDTH_ATTR, getPenStrokeWidthFromStyle(element.style));
  node.setAttr(ELEMENT_CREATED_AT_ATTR, element.createdAt);
}

export function createPenPathFromElement(render: RenderService, theme: ThemeService, element: TElement) {
  if (element.data.type !== "pen") {
    throw new Error("Unsupported element type for createPenPathFromElement");
  }

  const node = new render.Path({
    id: element.id,
    x: element.x,
    y: element.y,
    rotation: element.rotation,
    data: getStrokePathFromPenData(element, {
      size: getPenStrokeWidthFromStyle(element.style),
    }),
    fill: getPenFillFromStyle(theme, element.style),
    opacity: element.style.opacity ?? DEFAULT_OPACITY,
    listening: true,
    draggable: true,
    visible: true,
  });

  syncPenMetadata(node, element);
  setNodeZIndex(node, element.zIndex);
  return node;
}

export function updatePenPathFromElement(node: Konva.Path, theme: ThemeService, element: TElement) {
  if (element.data.type !== "pen") {
    return false;
  }

  node.id(element.id);
  node.absolutePosition(fxGetAbsolutePositionFromWorldPosition({
    worldPosition: { x: element.x, y: element.y },
    parentTransform: node.getLayer()?.getAbsoluteTransform() ?? null,
  }));
  node.rotation(element.rotation);
  node.data(getStrokePathFromPenData(element, {
    size: getPenStrokeWidthFromStyle(element.style),
  }));
  node.fill(getPenFillFromStyle(theme, element.style));
  node.opacity(element.style.opacity ?? DEFAULT_OPACITY);
  node.scale({ x: 1, y: 1 });
  syncPenMetadata(node, element);
  setNodeZIndex(node, element.zIndex);
  return true;
}

export function penPathToElement(render: RenderService, node: Konva.Path): TElement {
  const baseData = structuredClone(node.getAttr(ELEMENT_DATA_ATTR) as TPenData | undefined);
  if (!baseData || baseData.type !== "pen") {
    throw new Error("Pen path is missing vcElementData metadata");
  }

  const baseStyle = structuredClone((node.getAttr(ELEMENT_STYLE_ATTR) as TElementStyle | undefined) ?? {});
  const absoluteScale = node.getAbsoluteScale();
  const layer = node.getLayer();
  const layerScaleX = layer?.scaleX() ?? 1;
  const layerScaleY = layer?.scaleY() ?? 1;
  const scaleX = absoluteScale.x / layerScaleX;
  const scaleY = absoluteScale.y / layerScaleY;
  const worldPosition = fxGetWorldPosition({
    absolutePosition: node.absolutePosition(),
    parentTransform: node.getLayer()?.getAbsoluteTransform() ?? null,
  });
  const parent = node.getParent();
  const parentGroupId = parent instanceof render.Group ? parent.id() : null;

  return {
    id: node.id(),
    rotation: node.getAbsoluteRotation(),
    x: worldPosition.x,
    y: worldPosition.y,
    bindings: [],
    createdAt: Number(node.getAttr(ELEMENT_CREATED_AT_ATTR) ?? Date.now()),
    locked: false,
    parentGroupId,
    updatedAt: Date.now(),
    zIndex: fxGetNodeZIndex(node),
    data: {
      ...baseData,
      points: scalePenDataPoints(baseData.points, scaleX, scaleY),
    },
    style: createPenStyleFromNode(node, baseStyle),
  } satisfies TElement;
}
