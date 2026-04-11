import { TElement, TElementData, TElementStyle, TDiamondData, TEllipseData, TRectData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import Konva from "konva";
import type { TTool } from "../../components/FloatingCanvasToolbar/toolbar.types";
import { getWorldPosition } from "../shared/node-space";
import { getNodeZIndex, setNodeZIndex } from "../shared/render-order.shared";

export function createZeroSizeShapeData(tool: TTool): TElementData {
  if (tool === "rectangle") return { type: "rect", w: 0, h: 0 };
  if (tool === "diamond") return { type: "diamond", w: 0, h: 0 };
  if (tool === "ellipse") return { type: "ellipse", rx: 0, ry: 0 };
  throw new Error(`Unknown shape tool: ${tool}`);
}

export function isDiamondNode(node: Konva.Node): node is Konva.Line {
  return node instanceof Konva.Line && node.closed() === true && node.getAttr("vcShape2dType") === "diamond";
}

export function getDiamondPoints(w: number, h: number) {
  return [w / 2, 0, w, h / 2, w / 2, h, 0, h / 2];
}

export function getDiamondDimensions(shape: Konva.Line) {
  const points = shape.points();
  const xs = points.filter((_, index) => index % 2 === 0);
  const ys = points.filter((_, index) => index % 2 === 1);
  const baseWidth = Math.max(...xs, 0) - Math.min(...xs, 0);
  const baseHeight = Math.max(...ys, 0) - Math.min(...ys, 0);
  const absoluteScale = shape.getAbsoluteScale();
  const layer = shape.getLayer();
  const layerScaleX = layer?.scaleX() ?? 1;
  const layerScaleY = layer?.scaleY() ?? 1;

  return {
    w: baseWidth * (absoluteScale.x / layerScaleX),
    h: baseHeight * (absoluteScale.y / layerScaleY),
  };
}

export function applyDiamondSize(shape: Konva.Line, w: number, h: number) {
  shape.points(getDiamondPoints(w, h));
}

export function createRectFromElement(element: TElement) {
  const data = element.data as TRectData;
  const shape = new Konva.Rect({
    id: element.id,
    rotation: element.rotation,
    x: element.x,
    y: element.y,
    width: data.w,
    height: data.h,
    fill: element.style.backgroundColor,
    stroke: element.style.strokeColor,
    strokeWidth: element.style.strokeWidth,
    opacity: element.style.opacity,
    draggable: false,
  });

  setNodeZIndex(shape, element.zIndex);
  return shape;
}

export function createDiamondFromElement(element: TElement) {
  const data = element.data as TDiamondData;
  const shape = new Konva.Line({
    id: element.id,
    rotation: element.rotation,
    x: element.x,
    y: element.y,
    closed: true,
    points: getDiamondPoints(data.w, data.h),
    fill: element.style.backgroundColor,
    stroke: element.style.strokeColor,
    strokeWidth: element.style.strokeWidth,
    opacity: element.style.opacity,
    draggable: false,
  });
  shape.setAttr("vcShape2dType", "diamond");

  setNodeZIndex(shape, element.zIndex);
  return shape;
}

export function createEllipseFromElement(element: TElement) {
  const data = element.data as TEllipseData;
  const shape = new Konva.Ellipse({
    id: element.id,
    rotation: element.rotation,
    x: element.x + data.rx,
    y: element.y + data.ry,
    radiusX: data.rx,
    radiusY: data.ry,
    fill: element.style.backgroundColor,
    stroke: element.style.strokeColor,
    strokeWidth: element.style.strokeWidth,
    opacity: element.style.opacity,
    draggable: false,
  });

  setNodeZIndex(shape, element.zIndex);
  return shape;
}

export function createShapeFromElement(element: TElement): Konva.Shape | null {
  if (element.data.type === "rect") return createRectFromElement(element);
  if (element.data.type === "diamond") return createDiamondFromElement(element);
  if (element.data.type === "ellipse") return createEllipseFromElement(element);
  return null;
}

export function toTElement(shape: Konva.Shape): TElement {
  let data!: TElementData;
  let x!: number;
  let y!: number;

  if (shape instanceof Konva.Rect) {
    const absoluteScale = shape.getAbsoluteScale();
    const layer = shape.getLayer();
    const layerScaleX = layer?.scaleX() ?? 1;
    const layerScaleY = layer?.scaleY() ?? 1;
    data = {
      type: "rect",
      w: shape.width() * (absoluteScale.x / layerScaleX),
      h: shape.height() * (absoluteScale.y / layerScaleY),
    };
    const position = getWorldPosition(shape);
    x = position.x;
    y = position.y;
  } else if (shape instanceof Konva.Ellipse) {
    const absoluteScale = shape.getAbsoluteScale();
    const layer = shape.getLayer();
    const layerScaleX = layer?.scaleX() ?? 1;
    const layerScaleY = layer?.scaleY() ?? 1;
    const rx = shape.radiusX() * (absoluteScale.x / layerScaleX);
    const ry = shape.radiusY() * (absoluteScale.y / layerScaleY);
    data = { type: "ellipse", rx, ry };
    const position = getWorldPosition(shape);
    x = position.x - rx;
    y = position.y - ry;
  } else if (isDiamondNode(shape)) {
    const { w, h } = getDiamondDimensions(shape);
    data = { type: "diamond", w, h };
    const position = getWorldPosition(shape);
    x = position.x;
    y = position.y;
  } else {
    throw new Error("Unsupported shape type");
  }

  const style: TElementStyle = {
    opacity: shape.opacity(),
    strokeWidth: shape.strokeWidth(),
  };

  if (typeof shape.fill() === "string") style.backgroundColor = shape.fill() as string;
  if (typeof shape.stroke() === "string") style.strokeColor = shape.stroke() as string;

  const parent = shape.getParent();
  const parentGroupId = parent instanceof Konva.Group ? parent.id() : null;

  return {
    id: shape.id(),
    rotation: shape.getAbsoluteRotation(),
    x,
    y,
    bindings: [],
    createdAt: Date.now(),
    locked: false,
    parentGroupId,
    updatedAt: Date.now(),
    zIndex: getNodeZIndex(shape),
    data,
    style,
  };
}

export function createShapeFromNode(shape: Konva.Shape) {
  if (!(shape instanceof Konva.Rect) && !(shape instanceof Konva.Ellipse) && !isDiamondNode(shape)) {
    return null;
  }

  const element = toTElement(shape);
  return createShapeFromElement({
    ...element,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export function createPreviewClone(shape: Konva.Shape) {
  const newShape = createShapeFromNode(shape);
  if (!newShape) return null;

  newShape.id(crypto.randomUUID());
  newShape.setDraggable(true);
  return newShape;
}
