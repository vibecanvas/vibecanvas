import type { TArrowData, TElement } from "@vibecanvas/shell/automerge/index";
import Konva from "konva";
import { setNodeZIndex } from "../shared/render-order.shared";
import { DEFAULT_OPACITY, EDIT_HANDLE_STROKE, MIN_HIT_STROKE_WIDTH, type TPoint, type TShape1dData, type TShape1dNode, getStrokeColorFromStyle, getStrokeWidthFromStyle, isSupportedElementType } from "./Shape1d.shared";

function getBoundsPadding(data: TShape1dData, strokeWidth: number) {
  const base = Math.max(strokeWidth * 1.5, 8);
  return data.type !== "arrow" ? base : Math.max(base, strokeWidth * 4.5, 18);
}

function traceCurvedSegments(context: Konva.Context, points: TPoint[]) {
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index]!;
    const p1 = points[index]!;
    const p2 = points[index + 1]!;
    const p3 = points[index + 2] ?? p2;
    const cp1: TPoint = [p1[0] + ((p2[0] - p0[0]) / 6), p1[1] + ((p2[1] - p0[1]) / 6)];
    const cp2: TPoint = [p2[0] - ((p3[0] - p1[0]) / 6), p2[1] - ((p3[1] - p1[1]) / 6)];
    context.bezierCurveTo(cp1[0], cp1[1], cp2[0], cp2[1], p2[0], p2[1]);
  }
}

function traceLinePath(context: Konva.Context, data: TShape1dData) {
  const [firstX, firstY] = data.points[0] ?? [0, 0];
  context.moveTo(firstX, firstY);
  if (data.lineType === "curved" && data.points.length > 2) return traceCurvedSegments(context, data.points);
  for (let index = 1; index < data.points.length; index += 1) {
    const point = data.points[index];
    if (point) context.lineTo(point[0], point[1]);
  }
}

function traceCapPath(context: Konva.Context, data: TArrowData, edge: "start" | "end", strokeWidth: number) {
  const capType = edge === "start" ? data.startCap : data.endCap;
  if (capType === "none") return;
  const points = data.points;
  const anchor = edge === "start" ? points[0] : points[points.length - 1];
  const adjacent = edge === "start" ? points[1] : points[points.length - 2];
  if (!anchor || !adjacent) return;
  const dx = anchor[0] - adjacent[0];
  const dy = anchor[1] - adjacent[1];
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const px = -uy;
  const py = ux;
  const capLength = Math.max(12, strokeWidth * 4);
  const capWidth = Math.max(8, strokeWidth * 2.5);
  const [tipX, tipY] = anchor;
  const baseX = tipX - ux * capLength;
  const baseY = tipY - uy * capLength;
  if (capType === "dot") {
    const radius = Math.max(4, strokeWidth * 1.6);
    context.moveTo(tipX + radius, tipY);
    context.arc(tipX, tipY, radius, 0, Math.PI * 2);
    return;
  }
  if (capType === "arrow") {
    context.moveTo(tipX, tipY);
    context.lineTo(baseX + px * (capWidth / 2), baseY + py * (capWidth / 2));
    context.lineTo(baseX - px * (capWidth / 2), baseY - py * (capWidth / 2));
    context.closePath();
    return;
  }
  const middleX = tipX - ux * (capLength / 2);
  const middleY = tipY - uy * (capLength / 2);
  context.moveTo(tipX, tipY);
  context.lineTo(middleX + px * (capWidth / 2), middleY + py * (capWidth / 2));
  context.lineTo(baseX, baseY);
  context.lineTo(middleX - px * (capWidth / 2), middleY - py * (capWidth / 2));
  context.closePath();
}

function drawScene(context: Konva.Context, node: TShape1dNode) {
  const data = node.getAttr("vcElementData") as TShape1dData | undefined;
  if (!data || data.points.length < 2) return;
  context.beginPath();
  traceLinePath(context, data);
  context.strokeShape(node);
  if (data.type !== "arrow") return;
  context.beginPath();
  traceCapPath(context, data, "start", node.strokeWidth());
  traceCapPath(context, data, "end", node.strokeWidth());
  context.fillStrokeShape(node);
}

function getSelfRect(node: TShape1dNode) {
  const data = node.getAttr("vcElementData") as TShape1dData | undefined;
  const strokeWidth = getStrokeWidthFromStyle((node.getAttr("vcElementStyle") as import("@vibecanvas/shell/automerge/index").TElementStyle | undefined) ?? {});
  if (!data || data.points.length === 0) return { x: -strokeWidth, y: -strokeWidth, width: strokeWidth * 2, height: strokeWidth * 2 };
  const xs = data.points.map((point) => point[0]);
  const ys = data.points.map((point) => point[1]);
  const pad = getBoundsPadding(data, strokeWidth);
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const maxX = Math.max(...xs) + pad;
  const maxY = Math.max(...ys) + pad;
  return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

function createNode(config?: Konva.ShapeConfig) {
  const node = new Konva.Shape({ perfectDrawEnabled: false, lineCap: "round", lineJoin: "round", ...config, sceneFunc(context, shape) { drawScene(context, shape as TShape1dNode); } }) as TShape1dNode;
  node.getSelfRect = () => getSelfRect(node);
  return node;
}

export function createShapeFromElement(element: TElement) {
  if (!isSupportedElementType(element.data.type)) throw new Error("Unsupported element type for Shape1dPlugin");
  const strokeWidth = getStrokeWidthFromStyle(element.style);
  const color = getStrokeColorFromStyle(element.style);
  const node = createNode({ id: element.id, x: element.x, y: element.y, rotation: element.rotation, stroke: color, fill: color, strokeWidth, hitStrokeWidth: Math.max(MIN_HIT_STROKE_WIDTH, strokeWidth + 8), opacity: element.style.opacity ?? DEFAULT_OPACITY, draggable: false, listening: true });
  node.setAttr("vcElementData", structuredClone(element.data));
  node.setAttr("vcElementStyle", structuredClone(element.style));
  setNodeZIndex(node, element.zIndex);
  return node;
}

export const SHAPE1D_HANDLE_STROKE = EDIT_HANDLE_STROKE;
